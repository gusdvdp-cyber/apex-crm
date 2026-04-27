import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import ThemeProvider from "@/components/layout/ThemeProvider";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/login");

  // ── Org-subdomain validation ──────────────────────────────────
  const headerList = await headers();
  const slug = headerList.get("x-org-slug");
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  if (slug && rootDomain) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: slugOrg } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (slugOrg && slugOrg.id !== profile.organization_id) {
      // User belongs to a different org — redirect to their own subdomain
      const { data: userOrg } = await admin
        .from("organizations")
        .select("slug")
        .eq("id", profile.organization_id)
        .single();

      if (userOrg?.slug) {
        redirect(`https://${userOrg.slug}.${rootDomain}/inbox`);
      }
    }
  }

  const { data: orgModules } = await supabase
    .from("org_modules")
    .select("module_key")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true);

  const activeModuleKeys = (orgModules ?? []).map((m: { module_key: string }) => m.module_key);

  return (
    <ThemeProvider organizationId={profile.organization_id}>
      <DashboardShell>
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <Sidebar
            activeModuleKeys={activeModuleKeys}
            isSuperAdmin={profile.role === "super_admin"}
            userFullName={profile.full_name ?? user.email ?? "Usuario"}
            userRole={profile.role}
          />
          <main className="dashboard-main" style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
            {children}
          </main>
        </div>
      </DashboardShell>
    </ThemeProvider>
  );
}
