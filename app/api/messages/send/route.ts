import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function digitsOnly(val: string | number): string {
  const s = String(val);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] >= "0" && s[i] <= "9") out += s[i];
  }
  return out;
}

function stripPrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

async function findOrCreateConversation(orgId: string, phone: string | number, contactName?: string): Promise<string | null> {
  const cleanPhone = digitsOnly(phone);
  const externalId = "wa_" + cleanPhone;

  const { data: existing } = await admin
    .from("conversations").select("id").eq("organization_id", orgId).eq("external_id", externalId).single();
  if (existing) return existing.id;

  // Find or create contact
  let contactId: string | null = null;
  const { data: contact } = await admin
    .from("contacts").select("id").eq("organization_id", orgId).eq("phone", cleanPhone).single();
  if (contact) {
    contactId = contact.id;
  } else {
    const nameParts = (contactName ?? cleanPhone).split(" ");
    const { data: newContact } = await admin.from("contacts").insert({
      organization_id: orgId,
      name: nameParts[0] ?? cleanPhone,
      last_name: nameParts.slice(1).join(" ") || null,
      phone: cleanPhone,
    }).select("id").single();
    contactId = newContact?.id ?? null;
  }

  const { data: newConv } = await admin.from("conversations").insert({
    organization_id: orgId,
    channel: "whatsapp",
    external_id: externalId,
    contact_id: contactId,
    last_message: "",
    unread_count: 0,
    is_online: false,
  }).select("id").single();

  return newConv?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { conversation_id, content, media_url, media_type, media_mime, template_name, template_language, template_components, org_slug, contact_name } = body;
  let phone: string = digitsOnly(body.phone ?? "");

    if (!content && !media_url && !template_name)
      return NextResponse.json({ error: "Falta content, media_url o template_name" }, { status: 400 });

    // ── Auth: session o API key ────────────────────────────────
    let userId: string | null = null;
    let orgId: string | null = null;
    let agentName = "n8n";

    const apiKey = req.headers.get("x-api-key");
    if (apiKey) {
      if (apiKey !== process.env.SEND_API_KEY)
        return NextResponse.json({ error: "API key inválida" }, { status: 401 });

      if (!org_slug)
        return NextResponse.json({ error: "Falta org_slug" }, { status: 400 });

      const { data: org } = await admin
        .from("organizations").select("id").eq("slug", org_slug).single();
      if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      orgId = org.id;
    } else {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      userId = user.id;

      const { data: profile } = await supabase
        .from("profiles").select("organization_id, display_name").eq("id", user.id).single();
      if (!profile) return NextResponse.json({ error: "Sin perfil" }, { status: 400 });
      orgId = profile.organization_id;
      agentName = profile.display_name ?? "Agente";
    }

    // ── Resolver conversation_id desde phone si es necesario ───
    if (!conversation_id) {
      if (!phone)
        return NextResponse.json({ error: "Falta conversation_id o phone" }, { status: 400 });
      conversation_id = await findOrCreateConversation(orgId!, phone, contact_name);
      if (!conversation_id)
        return NextResponse.json({ error: "No se pudo crear la conversación" }, { status: 500 });
    }

    // ── Cargar conversación ────────────────────────────────────
    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .select("external_id, channel, assigned_to, organization_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation)
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

    // Verificar que pertenece a la org del caller
    if (conversation.organization_id !== orgId)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // ── Auto-assign (solo en sesión de usuario) ────────────────
    if (userId && conversation.assigned_to === null) {
      await Promise.all([
        admin.from("conversations").update({ assigned_to: userId }).eq("id", conversation_id),
        admin.from("activity_log").insert({
          organization_id: orgId,
          conversation_id,
          performed_by: userId,
          action_type: "conversation_assigned",
          description: `Conversación asignada a ${agentName}`,
        }),
      ]);
    }

    const displayText = content || (template_name ? `[Plantilla: ${template_name}]` : media_type === "image" ? "[imagen]" : "[archivo]");

    const saveMessage = async (externalId: string | null) => {
      await Promise.all([
        admin.from("messages").insert({
          conversation_id,
          external_id: externalId,
          text: displayText,
          from_type: "me",
          sent_by: userId ?? null,
          media_url: media_url ?? null,
          media_type: media_type ?? null,
        }),
        admin.from("conversations").update({
          last_message: displayText,
          updated_at: new Date().toISOString(),
        }).eq("id", conversation_id),
      ]);
    };

    const channel = conversation.channel;

    // ── WhatsApp ───────────────────────────────────────────────
    if (channel === "whatsapp") {
      const toPhone = stripPrefix(conversation.external_id ?? "", "wa_");
      if (!toPhone)
        return NextResponse.json({ error: "No hay número de WhatsApp" }, { status: 400 });

      const { data: integration } = await admin
        .from("org_integrations").select("config")
        .eq("organization_id", orgId).eq("channel", "whatsapp").eq("is_active", true).single();

      const cfg = integration?.config ?? {};
      const phoneNumberId = cfg.phone_number_id;
      const accessToken = cfg.access_token || process.env.META_PAGE_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken)
        return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 400 });

      let waBody: Record<string, unknown>;

      if (template_name) {
        waBody = {
          messaging_product: "whatsapp",
          to: toPhone,
          type: "template",
          template: {
            name: template_name,
            language: { code: template_language ?? "es" },
            components: template_components ?? [],
          },
        };
      } else if (media_url && media_type === "image") {
        const mimeType = (media_mime || "image/jpeg").split(";")[0];
        const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
        const ext = extMap[mimeType] ?? mimeType.split("/")[1] ?? "bin";

        const fileRes = await fetch(media_url);
        if (!fileRes.ok)
          return NextResponse.json({ error: "Error al descargar imagen" }, { status: 500 });
        const fileBuffer = await fileRes.arrayBuffer();

        const form = new FormData();
        form.append("messaging_product", "whatsapp");
        form.append("type", mimeType);
        form.append("file", new File([fileBuffer], `media.${ext}`, { type: mimeType }));

        const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.text();
          return NextResponse.json({ error: "Error al subir imagen a Meta", detail: err }, { status: 500 });
        }
        const { id: mediaId } = await uploadRes.json() as { id: string };
        waBody = {
          messaging_product: "whatsapp", to: toPhone, type: "image",
          image: { id: mediaId, ...(content ? { caption: content } : {}) },
        };
      } else {
        waBody = {
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: content },
        };
      }

      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(waBody),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Error al enviar por WhatsApp", detail: err }, { status: 500 });
      }

      const result = await res.json();
      await saveMessage(result?.messages?.[0]?.id ?? null);
      return NextResponse.json({ ok: true, conversation_id });
    }

    // ── Instagram / Messenger ──────────────────────────────────
    if (channel === "instagram" || channel === "messenger") {
      const extId = conversation.external_id ?? "";
      const recipientId = extId.startsWith("ig_") ? extId.slice(3) : extId.startsWith("fb_") ? extId.slice(3) : extId;
      if (!recipientId)
        return NextResponse.json({ error: "No hay ID de destinatario" }, { status: 400 });

      const { data: integration } = await admin
        .from("org_integrations").select("config")
        .eq("organization_id", orgId).eq("channel", "meta").eq("is_active", true).single();

      const cfg = integration?.config ?? {};
      const pageAccessToken = cfg.page_access_token || process.env.META_PAGE_ACCESS_TOKEN || process.env.META_IG_ACCESS_TOKEN;

      if (!pageAccessToken)
        return NextResponse.json({ error: "Instagram/Messenger no configurado" }, { status: 400 });

      const res = await fetch("https://graph.facebook.com/v20.0/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageAccessToken}` },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: content } }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Error al enviar mensaje", detail: err }, { status: 500 });
      }

      const result = await res.json();
      await saveMessage(result?.message_id ?? null);
      return NextResponse.json({ ok: true, conversation_id });
    }

    return NextResponse.json({ error: `Canal '${channel}' no soportado` }, { status: 400 });

  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
