import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const CHATWOOT_TOKEN = process.env.CHATWOOT_API_TOKEN!;
const CHATWOOT_ACCOUNT = process.env.CHATWOOT_ACCOUNT_ID!;

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1 — Obtener la conversación de Supabase para conseguir el external_id (chatwoot_X)
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

    // external_id tiene formato "chatwoot_123" → extraemos el número
    const chatwootConvId = conversation.external_id?.replace("chatwoot_", "");

    if (!chatwootConvId) {
      return NextResponse.json({ error: "No hay Chatwoot ID para esta conversación" }, { status: 400 });
    }

    // 2 — Enviar mensaje via Chatwoot API
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