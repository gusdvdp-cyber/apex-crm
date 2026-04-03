import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const META_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;
const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE!;

export async function POST(req: NextRequest) {
  const { conversationId, text, channel, recipientId } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const supabase = await createClient();
  let externalId: string | null = null;

  try {
    // ── Envío por canal ──────────────────────────────
    if (channel === "messenger") {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${META_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
          }),
        }
      );
      const data = await res.json();
      externalId = data.message_id ?? null;
    }

    else if (channel === "instagram") {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${META_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
          }),
        }
      );
      const data = await res.json();
      externalId = data.message_id ?? null;
    }

    else if (channel === "whatsapp") {
      const res = await fetch(
        `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_KEY,
          },
          body: JSON.stringify({
            number: recipientId,
            text,
          }),
        }
      );
      const data = await res.json();
      externalId = data.key?.id ?? null;
    }

    // ── Guardar en Supabase ──────────────────────────
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      from_type: "me",
      text,
      external_id: externalId,
    });

    await supabase.from("conversations").update({
      last_message: text,
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}