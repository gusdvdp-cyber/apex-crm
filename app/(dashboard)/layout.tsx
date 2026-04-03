// app/(dashboard)/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import ThemeProvider from "@/components/layout/ThemeProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/login");

  const { data: orgModules } = await supabase
    .from("org_modules")
    .select("module_key")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true);

  const activeModuleKeys = (orgModules ?? []).map((m: { module_key: string }) => m.module_key);

  return (
    <ThemeProvider organizationId={profile.organization_id}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar
          activeModuleKeys={activeModuleKeys}
          isSuperAdmin={profile.role === "super_admin"}
          userFullName={profile.full_name ?? user.email ?? "Usuario"}
          userRole={profile.role}
        />
        <main style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}