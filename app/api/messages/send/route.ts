import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN!;
const CHATWOOT_ACCOUNT = process.env.CHATWOOT_ACCOUNT_ID!;
const WA_TOKEN = process.env.WHATSAPP_TOKEN!;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID!;

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("external_id, channel, assigned_to, organization_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Obtener display_name del agente
    let agentName = "Agente";
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile?.display_name) agentName = profile.display_name;
    }

    // Auto-asignar si la conversación no tiene agente
    if (user?.id && conversation.assigned_to === null) {
      await Promise.all([
        supabase.from("conversations")
          .update({ assigned_to: user.id })
          .eq("id", conversation_id),
        supabase.from("activity_log").insert({
          organization_id: conversation.organization_id,
          conversation_id,
          performed_by: user.id,
          action_type: "conversation_assigned",
          description: `Conversación asignada a ${agentName}`,
        }),
      ]);
    }

    // ── WhatsApp via Meta Cloud API ─────────────────────────────
    if (conversation.channel === "whatsapp") {
      const phone = conversation.external_id?.replace("wa_", "");

      if (!phone) {
        return NextResponse.json({ error: "No hay número de WhatsApp" }, { status: 400 });
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${WA_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: content },
          }),
        }
      );

      if (!metaRes.ok) {
        const err = await metaRes.text();
        console.error("Meta API error:", err);
        return NextResponse.json({ error: "Error al enviar por WhatsApp", detail: err }, { status: 500 });
      }

      const result = await metaRes.json();
      const messageId = result.messages?.[0]?.id ?? null;

      await supabase.from("messages").insert({
        conversation_id,
        external_id: messageId,
        text: content,
        from_type: "me",
        sent_by: user?.id ?? null,
      });

      await supabase.from("conversations").update({
        last_message: content,
        updated_at: new Date().toISOString(),
      }).eq("id", conversation_id);

      return NextResponse.json({ ok: true, message_id: messageId });
    }

    // ── Instagram / Messenger via Chatwoot ─────────────────────
    const chatwootConvId = conversation.external_id?.replace("chatwoot_", "");

    if (!chatwootConvId) {
      return NextResponse.json({ error: "No hay Chatwoot ID para esta conversación" }, { status: 400 });
    }

    const chatwootRes = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT}/conversations/${chatwootConvId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": CHATWOOT_TOKEN,
        },
        body: JSON.stringify({ content, message_type: "outgoing", private: false }),
      }
    );

    if (!chatwootRes.ok) {
      const err = await chatwootRes.text();
      console.error("Chatwoot error:", err);
      return NextResponse.json({ error: "Error al enviar por Chatwoot", detail: err }, { status: 500 });
    }

    const result = await chatwootRes.json();

    await supabase.from("messages").insert({
      conversation_id,
      external_id: String(result.id) ?? null,
      text: content,
      from_type: "me",
      sent_by: user?.id ?? null,
    });

    await supabase.from("conversations").update({
      last_message: content,
      updated_at: new Date().toISOString(),
    }).eq("id", conversation_id);

    return NextResponse.json({ ok: true, message_id: result.id });

  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
