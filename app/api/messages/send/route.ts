import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content } = await req.json();
    if (!conversation_id || !content)
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

    const saveMessage = async (externalId: string | null) => {
      await supabase.from("messages").insert({
        conversation_id,
        external_id: externalId,
        text: content,
        from_type: "me",
        sent_by: user?.id ?? null,
      });
      await supabase.from("conversations").update({
        last_message: content,
        updated_at: new Date().toISOString(),
      }).eq("id", conversation_id);
    };

    // ── WhatsApp via Evolution API ──────────────────────────────
    if (conversation.channel === "whatsapp") {
      const phone = conversation.external_id?.replace(/^wa_/, "");
      if (!phone)
        return NextResponse.json({ error: "No hay número de WhatsApp" }, { status: 400 });

      // Fetch org-level config
      const { data: integration } = await supabase
        .from("org_integrations")
        .select("config")
        .eq("organization_id", conversation.organization_id)
        .eq("channel", "whatsapp")
        .eq("is_active", true)
        .single();

      const cfg = integration?.config ?? {};
      const evoUrl = cfg.evolution_url || process.env.EVOLUTION_API_URL;
      const evoKey = cfg.evolution_api_key || process.env.EVOLUTION_API_KEY;
      const evoInstance = cfg.evolution_instance || process.env.EVOLUTION_INSTANCE;

      if (!evoUrl || !evoKey || !evoInstance)
        return NextResponse.json({ error: "WhatsApp no configurado para esta organización. Configurá las credenciales en Ajustes → Canales." }, { status: 400 });

      const res = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": evoKey },
        body: JSON.stringify({ number: phone, text: content }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Evolution API error:", err);
        return NextResponse.json({ error: "Error al enviar por WhatsApp", detail: err }, { status: 500 });
      }

      const result = await res.json();
      await saveMessage(result?.key?.id ?? null);
      return NextResponse.json({ ok: true });
    }

    // ── Instagram / Messenger via Chatwoot ──────────────────────
    const chatwootConvId = conversation.external_id?.replace("chatwoot_", "");
    if (!chatwootConvId)
      return NextResponse.json({ error: "No hay ID de Chatwoot para esta conversación" }, { status: 400 });

    // Fetch org-level config
    const { data: integration } = await supabase
      .from("org_integrations")
      .select("config")
      .eq("organization_id", conversation.organization_id)
      .eq("channel", "chatwoot")
      .eq("is_active", true)
      .single();

    const cfg = integration?.config ?? {};
    const cwUrl = cfg.chatwoot_url || process.env.CHATWOOT_URL;
    const cwToken = cfg.chatwoot_api_token || process.env.CHATWOOT_API_TOKEN;
    const cwAccount = cfg.chatwoot_account_id || process.env.CHATWOOT_ACCOUNT_ID;

    if (!cwUrl || !cwToken || !cwAccount)
      return NextResponse.json({ error: "Instagram/Messenger no configurado para esta organización. Configurá las credenciales en Ajustes → Canales." }, { status: 400 });

    const cwRes = await fetch(
      `${cwUrl}/api/v1/accounts/${cwAccount}/conversations/${chatwootConvId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api_access_token": cwToken },
        body: JSON.stringify({ content, message_type: "outgoing", private: false }),
      }
    );

    if (!cwRes.ok) {
      const err = await cwRes.text();
      console.error("Chatwoot error:", err);
      return NextResponse.json({ error: "Error al enviar por Chatwoot", detail: err }, { status: 500 });
    }

    const result = await cwRes.json();
    await saveMessage(String(result.id) ?? null);
    return NextResponse.json({ ok: true, message_id: result.id });

  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
