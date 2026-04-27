import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content, media_url, media_type } = await req.json();
    if (!conversation_id || (!content && !media_url))
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("external_id, channel, assigned_to, organization_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation)
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

    // Agent display name
    let agentName = "Agente";
    if (user?.id) {
      const { data: p } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      if (p?.display_name) agentName = p.display_name;
    }

    // Auto-assign
    if (user?.id && conversation.assigned_to === null) {
      await Promise.all([
        supabase.from("conversations").update({ assigned_to: user.id }).eq("id", conversation_id),
        supabase.from("activity_log").insert({
          organization_id: conversation.organization_id,
          conversation_id,
          performed_by: user.id,
          action_type: "conversation_assigned",
          description: `Conversación asignada a ${agentName}`,
        }),
      ]);
    }

    const displayText = content || (media_type === "image" ? "[imagen]" : media_type === "audio" ? "[audio]" : "[archivo]");

    const saveMessage = async (externalId: string | null) => {
      await Promise.all([
        supabase.from("messages").insert({
          conversation_id,
          external_id: externalId,
          text: displayText,
          from_type: "me",
          sent_by: user?.id ?? null,
          media_url: media_url ?? null,
          media_type: media_type ?? null,
        }),
        supabase.from("conversations").update({
          last_message: displayText,
          updated_at: new Date().toISOString(),
        }).eq("id", conversation_id),
      ]);
    };

    const orgId = conversation.organization_id;
    const channel = conversation.channel;

    // ── WhatsApp via Meta Cloud API ────────────────────────────
    if (channel === "whatsapp") {
      const phone = conversation.external_id?.replace(/^wa_/, "");
      if (!phone)
        return NextResponse.json({ error: "No hay número de WhatsApp" }, { status: 400 });

      const { data: integration } = await supabase
        .from("org_integrations").select("config")
        .eq("organization_id", orgId).eq("channel", "whatsapp").eq("is_active", true).single();

      const cfg = integration?.config ?? {};
      const phoneNumberId = cfg.phone_number_id;
      const accessToken = cfg.access_token || process.env.META_PAGE_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken)
        return NextResponse.json({ error: "WhatsApp no configurado. Ir a Ajustes → Canales." }, { status: 400 });

      let waBody: Record<string, unknown>;

      if (media_url && media_type === "image") {
        waBody = {
          messaging_product: "whatsapp",
          to: phone,
          type: "image",
          image: { link: media_url, ...(content ? { caption: content } : {}) },
        };
      } else if (media_url && media_type === "audio") {
        waBody = {
          messaging_product: "whatsapp",
          to: phone,
          type: "audio",
          audio: { link: media_url },
        };
      } else {
        waBody = {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: content },
        };
      }

      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify(waBody),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("WhatsApp send error:", err);
        return NextResponse.json({ error: "Error al enviar por WhatsApp", detail: err }, { status: 500 });
      }

      const result = await res.json();
      await saveMessage(result?.messages?.[0]?.id ?? null);
      return NextResponse.json({ ok: true });
    }

    // ── Instagram / Messenger via Meta Graph API ───────────────
    if (channel === "instagram" || channel === "messenger") {
      const recipientId = conversation.external_id?.replace(/^(ig_|fb_)/, "");
      if (!recipientId)
        return NextResponse.json({ error: "No hay ID de destinatario" }, { status: 400 });

      const { data: integration } = await supabase
        .from("org_integrations").select("config")
        .eq("organization_id", orgId).eq("channel", "meta").eq("is_active", true).single();

      const cfg = integration?.config ?? {};
      const pageAccessToken = cfg.page_access_token || process.env.META_PAGE_ACCESS_TOKEN || process.env.META_IG_ACCESS_TOKEN;

      if (!pageAccessToken)
        return NextResponse.json({ error: "Instagram/Messenger no configurado. Ir a Ajustes → Canales." }, { status: 400 });

      const res = await fetch("https://graph.facebook.com/v20.0/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pageAccessToken}` },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Meta send error:", err);
        return NextResponse.json({ error: "Error al enviar mensaje", detail: err }, { status: 500 });
      }

      const result = await res.json();
      await saveMessage(result?.message_id ?? null);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Canal '${channel}' no soportado` }, { status: 400 });

  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
