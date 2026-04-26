import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Uses service role key so RLS doesn't block webhook inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { organization_id, contact_id, channel } = await req.json();

    if (!organization_id || !channel) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const { data: automations } = await supabase
      .from("pipeline_automations")
      .select("id, pipeline_id, stage_id, skip_if_exists")
      .eq("organization_id", organization_id)
      .eq("trigger_type", channel)
      .eq("active", true);

    if (!automations || automations.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    let created = 0;
    for (const auto of automations) {
      if (auto.skip_if_exists && contact_id) {
        const { count } = await supabase
          .from("pipeline_cards")
          .select("id", { count: "exact", head: true })
          .eq("pipeline_id", auto.pipeline_id)
          .eq("contact_id", contact_id);
        if (count && count > 0) continue;
      }

      await supabase.from("pipeline_cards").insert({
        pipeline_id: auto.pipeline_id,
        stage_id: auto.stage_id,
        contact_id: contact_id ?? null,
        channel,
      });
      created++;
    }

    return NextResponse.json({ ok: true, created });
  } catch (err) {
    console.error("Pipeline automate error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
