import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Sin perfil" }, { status: 400 });

  const { data: integration } = await admin
    .from("org_integrations").select("config")
    .eq("organization_id", profile.organization_id)
    .eq("channel", "whatsapp")
    .eq("is_active", true)
    .single();

  const cfg = integration?.config ?? {};
  const { access_token, waba_id } = cfg;

  if (!access_token || !waba_id)
    return NextResponse.json({ error: "Falta waba_id en la configuración de WhatsApp" }, { status: 400 });

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${waba_id}/message_templates?status=APPROVED&limit=100&fields=name,language,status,components`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: "Error al obtener plantillas de Meta", detail: err }, { status: 500 });
  }

  const data = await res.json() as { data: unknown[] };
  return NextResponse.json({ templates: data.data ?? [] });
}
