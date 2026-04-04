import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN!;
const CHATWOOT_ACCOUNT = process.env.CHATWOOT_ACCOUNT_ID!;
const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE!;

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

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("external_id, channel")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // ── WhatsApp via Evolution API ──────────────────────────────
    if (conversation.channel === "whatsapp") {
      const phone = conversation.external_id?.replace("wa_", "");

      if (!phone) {
        return NextResponse.json({ error: "No hay número de WhatsApp" }, { status: 400 });
      }

      const evoRes = await fetch(
        `${EVO_URL}/message/sendText/${EVO_INSTANCE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVO_KEY,
          },
          body: JSON.stringify({
            number: phone,
            text: content,
          }),
        }
      );

      if (!evoRes.ok) {
        const err = await evoRes.text();
        console.error("Evolution API error:", err);
        return NextResponse.json({ error: "Error al enviar por WhatsApp", detail: err }, { status: 500 });
      }

      const result = await evoRes.json();
      return NextResponse.json({ ok: true, message_id: result.key?.id });
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
        body: JSON.stringify({
          content,
          message_type: "outgoing",
          private: false,
        }),
      }
    );

    if (!chatwootRes.ok) {
      const err = await chatwootRes.text();
      console.error("Chatwoot error:", err);
      return NextResponse.json({ error: "Error al enviar por Chatwoot", detail: err }, { status: 500 });
    }

    const result = await chatwootRes.json();
    return NextResponse.json({ ok: true, message_id: result.id });

  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}