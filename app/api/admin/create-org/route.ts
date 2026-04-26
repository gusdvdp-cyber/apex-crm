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
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "super_admin")
      return NextResponse.json({ error: "Solo super admins" }, { status: 403 });

    const { name, slug, primary_color, admin_email } = await req.json();
    if (!name || !slug || !admin_email)
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });

    // Create org
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        primary_color: primary_color || "#c8f135",
      })
      .select().single();

    if (orgErr || !org)
      return NextResponse.json({ error: orgErr?.message || "Error al crear organización" }, { status: 500 });

    // Invite admin user — trigger SQL creates profile automatically
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(admin_email, {
      data: { organization_id: org.id, role: "admin", display_name: admin_email.split("@")[0] },
    });

    if (inviteErr) {
      await admin.from("organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, org });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
