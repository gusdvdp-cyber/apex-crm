import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { org_id } = await req.json();
  if (!org_id) return NextResponse.json({ error: "Falta org_id" }, { status: 400 });

  // Delete in dependency order
  const convIds = await admin
    .from("conversations").select("id").eq("organization_id", org_id)
    .then(({ data }) => (data ?? []).map((r: { id: string }) => r.id));

  if (convIds.length > 0) {
    await admin.from("messages").delete().in("conversation_id", convIds);
  }

  await Promise.all([
    admin.from("conversations").delete().eq("organization_id", org_id),
    admin.from("contacts").delete().eq("organization_id", org_id),
    admin.from("org_modules").delete().eq("organization_id", org_id),
    admin.from("org_integrations").delete().eq("organization_id", org_id),
    admin.from("activity_log").delete().eq("organization_id", org_id),
  ]);

  // Remove user auth accounts for profiles in this org
  const { data: profiles } = await admin
    .from("profiles").select("id").eq("organization_id", org_id);
  for (const p of profiles ?? []) {
    await admin.auth.admin.deleteUser(p.id);
  }

  await admin.from("organizations").delete().eq("id", org_id);

  return NextResponse.json({ ok: true });
}
