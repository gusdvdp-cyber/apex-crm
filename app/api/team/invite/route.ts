import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role, organization_id").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role))
      return NextResponse.json({ error: "Solo admins pueden invitar miembros" }, { status: 403 });

    const { email, role = "member", display_name } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: profile.organization_id,
        role,
        display_name: display_name || email.split("@")[0],
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role, organization_id").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role))
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

    // Verify target belongs to same org
    const { data: target } = await supabase
      .from("profiles").select("organization_id").eq("id", user_id).single();
    if (target?.organization_id !== profile.organization_id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await admin.auth.admin.deleteUser(user_id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
