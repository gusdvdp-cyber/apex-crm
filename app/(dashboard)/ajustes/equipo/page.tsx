"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Trash2, Mail, Shield, User, Clock } from "lucide-react";

interface Member {
  id: string;
  display_name: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Asesor",
};

const ROLE_COLOR: Record<string, string> = {
  super_admin: "#ef4444",
  admin: "#8b5cf6",
  member: "#3b82f6",
};

export default function EquipoPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState("");
  const [myId, setMyId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      const { data: profile } = await supabase
        .from("profiles").select("role, organization_id").eq("id", user.id).single();
      if (!profile) return;
      setMyRole(profile.role);
      setOrgId(profile.organization_id);

      await fetchMembers(profile.organization_id);
      setLoading(false);
    };
    load();
  }, []);

  const fetchMembers = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, role, created_at")
      .eq("organization_id", oid)
      .order("created_at");
    setMembers((data as Member[]) ?? []);
  };

  const invite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, display_name: inviteName || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setInviteMsg({ type: "err", text: json.error || "Error al invitar" });
    } else {
      setInviteMsg({ type: "ok", text: `Invitación enviada a ${inviteEmail}` });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      await fetchMembers(orgId);
    }
    setInviting(false);
  };

  const removeMember = async (userId: string) => {
    if (!confirm("¿Seguro que querés eliminar este miembro?")) return;
    setRemoving(userId);
    const res = await fetch("/api/team/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) await fetchMembers(orgId);
    setRemoving(null);
  };

  const isAdmin = ["admin", "super_admin"].includes(myRole);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0a0a" }}>
      <div style={{ padding: "28px", maxWidth: "760px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Equipo</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>
            {members.length} miembro{members.length !== 1 ? "s" : ""} en esta organización
          </p>
        </div>

        {/* Invite form — admin only */}
        {isAdmin && (
          <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <UserPlus size={14} color="#c8f135" />
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Invitar miembro</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: "8px", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="asesor@empresa.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && invite()}
                  style={{ width: "100%", padding: "9px 11px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Juan López"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  style={{ width: "100%", padding: "9px 11px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  Rol
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ padding: "9px 11px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", cursor: "pointer" }}
                >
                  <option value="member">Asesor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                onClick={invite}
                disabled={inviting || !inviteEmail}
                style={{ padding: "9px 16px", background: inviteEmail ? "#c8f135" : "#1a1a1a", border: "none", borderRadius: "8px", cursor: inviteEmail ? "pointer" : "default", fontSize: "12px", fontWeight: 700, color: inviteEmail ? "#0a0a0a" : "#444", whiteSpace: "nowrap", transition: "all 0.15s" }}
              >
                {inviting ? "Enviando..." : "Invitar"}
              </button>
            </div>

            {inviteMsg && (
              <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "8px", background: inviteMsg.type === "ok" ? "#c8f13515" : "#ef444415", border: `1px solid ${inviteMsg.type === "ok" ? "#c8f13530" : "#ef444430"}` }}>
                <p style={{ fontSize: "11px", color: inviteMsg.type === "ok" ? "#c8f135" : "#ef4444", margin: 0 }}>
                  {inviteMsg.text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Members list */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Miembro", "Rol", "Agregado", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const name = m.display_name || m.full_name || "Sin nombre";
                const isMe = m.id === myId;
                return (
                  <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? "1px solid #161616" : "none" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: ROLE_COLOR[m.role] + "20", border: `1px solid ${ROLE_COLOR[m.role]}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {m.role === "super_admin" ? <Shield size={12} color={ROLE_COLOR[m.role]} /> : <User size={12} color={ROLE_COLOR[m.role]} />}
                        </div>
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>
                            {name}
                            {isMe && <span style={{ fontSize: "9px", color: "#444", fontWeight: 400, marginLeft: "6px" }}>Tú</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: ROLE_COLOR[m.role] + "20", color: ROLE_COLOR[m.role] }}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={10} color="#333" />
                        <span style={{ fontSize: "11px", color: "#444" }}>
                          {new Date(m.created_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      {isAdmin && !isMe && m.role !== "super_admin" && (
                        <button
                          onClick={() => removeMember(m.id)}
                          disabled={removing === m.id}
                          style={{ width: "28px", height: "28px", borderRadius: "7px", background: "transparent", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: removing === m.id ? 0.4 : 1, transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget).style.background = "#ef444415"; (e.currentTarget).style.borderColor = "#ef444440"; }}
                          onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.borderColor = "#1e1e1e"; }}
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Mail size={11} color="#333" />
          <p style={{ fontSize: "10px", color: "#333", margin: 0 }}>
            Los invitados reciben un email para crear su contraseña. Hasta que lo hagan, aparecen en la lista pero no pueden acceder.
          </p>
        </div>

      </div>
    </div>
  );
}
