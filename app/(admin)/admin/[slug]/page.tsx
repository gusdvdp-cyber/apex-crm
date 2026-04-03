"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Globe, Palette, Upload, Trash2, LayoutGrid } from "lucide-react";
import { MODULE_DEFINITIONS, MODULE_CATEGORY_LABELS, ModuleCategory } from "@/lib/modules";

interface Organization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  custom_domain: string | null;
}

export default function OrgDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [modulesMap, setModulesMap] = useState<Record<string, boolean>>({});
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    primary_color: "#c8f135",
    secondary_color: "#0a0a0a",
    custom_domain: "",
  });

  useEffect(() => { fetchOrg(); }, [slug]);

  const fetchOrg = async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .single();

    if (data) {
      setOrg(data);
      setForm({
        name: data.name,
        primary_color: data.primary_color || "#c8f135",
        secondary_color: data.secondary_color || "#0a0a0a",
        custom_domain: data.custom_domain || "",
      });

      // fetch módulos
      const { data: mods } = await supabase
        .from("org_modules")
        .select("module_key, is_active")
        .eq("organization_id", data.id);

      const map: Record<string, boolean> = {};
      (mods ?? []).forEach((m: { module_key: string; is_active: boolean }) => {
        map[m.module_key] = m.is_active;
      });
      setModulesMap(map);
    }

    setLoading(false);
  };

  const toggleModule = async (moduleKey: string) => {
    if (!org || togglingModule) return;
    setTogglingModule(moduleKey);

    const current = modulesMap[moduleKey] ?? false;
    const supabase = createClient();

    await supabase
      .from("org_modules")
      .upsert(
        { organization_id: org.id, module_key: moduleKey, is_active: !current },
        { onConflict: "organization_id,module_key" }
      );

    setModulesMap((prev) => ({ ...prev, [moduleKey]: !current }));
    setTogglingModule(null);
  };

  const saveChanges = async () => {
    if (!org) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("organizations").update({
      name: form.name,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      custom_domain: form.custom_domain || null,
    }).eq("id", org.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setUploadingLogo(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${org.slug}/logo.${ext}`;
    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      await supabase.from("organizations").update({ logo_url: data.publicUrl }).eq("id", org.id);
      setOrg({ ...org, logo_url: data.publicUrl });
    }
    setUploadingLogo(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  if (!org) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Organización no encontrada.</p>
    </div>
  );

  return (
    <div style={{ padding: "32px 24px", maxWidth: "720px", margin: "0 auto" }}>

      {/* Back */}
      <button
        onClick={() => router.push("/admin")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", color: "#444", fontSize: "12px", fontWeight: 500, marginBottom: "28px", padding: 0 }}
      >
        <ArrowLeft size={14} /> Volver a organizaciones
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: form.primary_color + "20", border: `1px solid ${form.primary_color}40`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {org.logo_url ? (
              <img src={org.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: form.primary_color }} />
            )}
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>{org.name}</h1>
            <span style={{ fontSize: "10px", color: "#444", fontFamily: "monospace" }}>/{org.slug}</span>
          </div>
        </div>
        <button
          onClick={saveChanges}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "10px", background: saved ? "#1a3a0a" : "#c8f135", border: saved ? "1px solid #c8f135" : "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: saved ? "#c8f135" : "#0a0a0a", transition: "all 0.2s ease" }}
        >
          <Save size={13} />
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>

      {/* Info general */}
      <Section title="Información general" icon={<Globe size={14} color="#c8f135" />}>
        <Field label="Nombre de la organización">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Dominio personalizado">
          <input type="text" value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="crm.miempresa.com" style={inputStyle} />
        </Field>
      </Section>

      {/* Branding */}
      <Section title="Branding & colores" icon={<Palette size={14} color="#c8f135" />}>
        <Field label="Color principal (acento)">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} style={{ width: "44px", height: "36px", borderRadius: "8px", border: "1px solid #1e1e1e", background: "#111", cursor: "pointer", padding: "2px" }} />
            <span style={{ fontSize: "12px", color: "#f0f0f0", fontFamily: "monospace" }}>{form.primary_color}</span>
            <div style={{ width: "80px", height: "28px", borderRadius: "6px", background: form.primary_color }} />
          </div>
        </Field>
        <Field label="Color secundario (fondo)">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} style={{ width: "44px", height: "36px", borderRadius: "8px", border: "1px solid #1e1e1e", background: "#111", cursor: "pointer", padding: "2px" }} />
            <span style={{ fontSize: "12px", color: "#f0f0f0", fontFamily: "monospace" }}>{form.secondary_color}</span>
            <div style={{ width: "80px", height: "28px", borderRadius: "6px", background: form.secondary_color, border: "1px solid #1e1e1e" }} />
          </div>
        </Field>
        <Field label="Preview del tema">
          <div style={{ padding: "16px", borderRadius: "10px", background: form.secondary_color, border: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: form.primary_color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, color: "#000", overflow: "hidden" }}>
              {org.logo_url ? <img src={org.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "A"}
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#fff", margin: 0 }}>{form.name}</p>
              <p style={{ fontSize: "10px", color: form.primary_color, margin: 0, fontWeight: 600 }}>CRM</p>
            </div>
          </div>
        </Field>
      </Section>

      {/* Logo */}
      <Section title="Logo" icon={<Upload size={14} color="#c8f135" />}>
        <Field label="Logo de la organización">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "12px", background: "#111", border: "2px dashed #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {org.logo_url ? <img src={org.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Upload size={20} color="#333" />}
            </div>
            <div>
              <label htmlFor="logo-upload" style={{ display: "block", padding: "8px 14px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#f0f0f0", marginBottom: "6px", textAlign: "center" }}>
                {uploadingLogo ? "Subiendo..." : "Subir logo"}
              </label>
              <input id="logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
              <p style={{ fontSize: "10px", color: "#444", margin: 0 }}>PNG, SVG, JPG. Máximo 2MB.</p>
            </div>
          </div>
        </Field>
      </Section>

      {/* ── MÓDULOS ─────────────────────────────────────── */}
      <Section title="Módulos activos" icon={<LayoutGrid size={14} color="#c8f135" />}>
        {(["core", "base", "nicho"] as ModuleCategory[]).map((cat) => {
          const mods = MODULE_DEFINITIONS.filter((m) => m.category === cat);
          return (
            <div key={cat}>
              <p style={{ fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                {MODULE_CATEGORY_LABELS[cat]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {mods.map((mod) => {
                  const isActive = modulesMap[mod.key] ?? false;
                  const isToggling = togglingModule === mod.key;
                  return (
                    <div
                      key={mod.key}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 14px", borderRadius: "10px",
                        background: isActive ? "#0f1a0a" : "#111",
                        border: `1px solid ${isActive ? "#c8f13530" : "#1a1a1a"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#f0f0f0" : "#555", margin: 0, transition: "color 0.15s" }}>
                          {mod.label}
                        </p>
                        <p style={{ fontSize: "10px", color: "#333", margin: "2px 0 0", lineHeight: 1.3 }}>
                          {mod.description}
                        </p>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => toggleModule(mod.key)}
                        disabled={!!isToggling}
                        style={{
                          width: "40px", height: "22px", borderRadius: "11px", border: "none",
                          cursor: isToggling ? "wait" : "pointer",
                          background: isActive ? "#c8f135" : "#222",
                          position: "relative", flexShrink: 0,
                          transition: "background 0.2s",
                          opacity: isToggling ? 0.6 : 1,
                        }}
                      >
                        <span style={{
                          position: "absolute", top: "3px",
                          left: isActive ? "21px" : "3px",
                          width: "16px", height: "16px", borderRadius: "50%",
                          background: isActive ? "#0a0a0a" : "#444",
                          transition: "left 0.2s, background 0.2s",
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>

      {/* Zona peligrosa */}
      <div style={{ background: "#0d0d0d", border: "1px solid #ff444420", borderRadius: "14px", padding: "20px", marginTop: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Trash2 size={14} color="#ff4444" />
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#ff4444", margin: 0 }}>Zona peligrosa</p>
        </div>
        <p style={{ fontSize: "11px", color: "#444", margin: "0 0 14px" }}>
          Eliminar esta organización borrará todos sus datos permanentemente.
        </p>
        <button style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}>
          Eliminar organización
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        {icon}
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{title}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "#111", border: "1px solid #1e1e1e",
  borderRadius: "8px", color: "#f0f0f0",
  fontSize: "13px", outline: "none",
};