"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings, Users, Globe, Palette, ChevronRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  logo_url: string | null;
  custom_domain: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "", primary_color: "#c8f135", admin_email: "" });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("organizations").select("*").order("created_at");
    if (data) setOrgs(data);
    setLoading(false);
  };

  const createOrg = async () => {
    if (!newOrg.name || !newOrg.slug || !newOrg.admin_email) return;
    setSaving(true);
    setCreateError("");
    const res = await fetch("/api/admin/create-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrg),
    });
    const json = await res.json();
    if (!res.ok) {
      setCreateError(json.error || "Error al crear");
    } else {
      await fetchOrgs();
      setShowNew(false);
      setNewOrg({ name: "", slug: "", primary_color: "#c8f135", admin_email: "" });
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>Organizaciones</h1>
          <p style={{ fontSize: "12px", color: "#444", margin: "6px 0 0" }}>
            Gestioná los tenants del CRM — cada uno con su propio branding y datos.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "10px", background: "#c8f135", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}
        >
          <Plus size={14} />
          Nueva organización
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Organizaciones", value: orgs.length, icon: Building2, color: "#c8f135" },
          { label: "Con dominio propio", value: orgs.filter(o => o.custom_domain).length, icon: Globe, color: "#7c3aed" },
          { label: "Activas", value: orgs.length, icon: Users, color: "#0891b2" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nueva org */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "28px", width: "420px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 20px" }}>Nueva organización</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Nombre de la organización", key: "name", placeholder: "Ej: Hotel Palermo", type: "text" },
                { label: "Slug (identificador único)", key: "slug", placeholder: "Ej: hotel-palermo", type: "text" },
                { label: "Email del admin (opcional)", key: "admin_email", placeholder: "admin@empresa.com", type: "email" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={newOrg[key as keyof typeof newOrg]}
                    onChange={(e) => setNewOrg({ ...newOrg, [key]: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                  Color de acento
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="color"
                    value={newOrg.primary_color}
                    onChange={(e) => setNewOrg({ ...newOrg, primary_color: e.target.value })}
                    style={{ width: "40px", height: "36px", borderRadius: "8px", border: "1px solid #1e1e1e", background: "#111", cursor: "pointer", padding: "2px" }}
                  />
                  <span style={{ fontSize: "12px", color: "#f0f0f0", fontFamily: "monospace" }}>{newOrg.primary_color}</span>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: newOrg.primary_color }} />
                </div>
              </div>
            </div>
            {createError && (
              <p style={{ fontSize: "11px", color: "#ef4444", margin: "4px 0 0", padding: "8px 10px", background: "#ef444415", borderRadius: "6px" }}>
                {createError}
              </p>
            )}
            <p style={{ fontSize: "10px", color: "#444", margin: "4px 0 0" }}>
              Se enviará un email de invitación al admin para que setee su contraseña.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={createOrg}
                disabled={saving || !newOrg.name || !newOrg.slug}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#c8f135", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: (saving || !newOrg.admin_email) ? 0.5 : 1 }}
              >
                {saving ? "Creando..." : newOrg.admin_email ? "Crear y enviar invitación" : "Crear organización"}
              </button>
              <button
                onClick={() => setShowNew(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de orgs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
        ) : orgs.map((org) => (
          <div
            key={org.id}
            style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", transition: "border-color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: org.primary_color + "20", border: `1px solid ${org.primary_color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: org.primary_color }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{org.name}</p>
                <span style={{ fontSize: "9px", fontWeight: 600, padding: "1px 7px", borderRadius: "20px", background: "#1e1e1e", color: "#555", fontFamily: "monospace" }}>
                  {org.slug}
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                {org.custom_domain && (
                  <span style={{ fontSize: "10px", color: "#444", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Globe size={10} /> {org.custom_domain}
                  </span>
                )}
                <span style={{ fontSize: "10px", color: "#444" }}>
                  Creada {new Date(org.created_at).toLocaleDateString("es-AR")}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Palette size={13} color="#444" />
              </button>
              <button style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Settings size={13} color="#444" />
              </button>
              <button
                onClick={() => router.push(`/admin/${org.slug}`)}
                style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <ChevronRight size={13} color="#c8f135" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}