import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/inbox");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Admin Topbar */}
      <div style={{
        height: "52px", background: "#080808",
        borderBottom: "1px solid #161616",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#c8f135", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#0a0a0a" }}>A</span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0" }}>
            Apex <span style={{ color: "#c8f135" }}>Admin</span>
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "#c8f13520", color: "#c8f135", letterSpacing: "0.08em" }}>
            SUPER ADMIN
          </span>
        </div>
        <a href="/inbox" style={{ fontSize: "11px", color: "#444", textDecoration: "none", fontWeight: 500 }}>
          ← Volver al CRM
        </a>
      </div>
      {children}
    </div>
  );
}