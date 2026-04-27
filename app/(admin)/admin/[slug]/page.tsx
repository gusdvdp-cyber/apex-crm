"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Globe, Palette, Upload, Trash2, LayoutGrid, Wifi, CheckCircle, AlertCircle, Copy, Check } from "lucide-react";
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

  // Canales state
  const [waConfig, setWaConfig] = useState({ phone_number_id: "", access_token: "", app_secret: "" });
  const [metaConfig, setMetaConfig] = useState({ page_id: "", page_access_token: "", app_secret: "" });
  const [savingWa, setSavingWa] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [msgWa, setMsgWa] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [msgMeta, setMsgMeta] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
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

      // fetch canales
      const { data: integrations } = await supabase
        .from("org_integrations").select("channel, config").eq("organization_id", data.id);
      (integrations ?? []).forEach((row: { channel: string; config: Record<string, string> }) => {
        if (row.channel === "whatsapp") setWaConfig({ phone_number_id: row.config.phone_number_id ?? "", access_token: row.config.access_token ?? "", app_secret: row.config.app_secret ?? "" });
        if (row.channel === "meta") setMetaConfig({ page_id: row.config.page_id ?? "", page_access_token: row.config.page_access_token ?? "", app_secret: row.config.app_secret ?? "" });
      });
    }

    setLoading(false);
  };

  const saveChannel = async (channel: string, config: Record<string, string>, setSaving: (v: boolean) => void, setMsg: (v: { type: "ok" | "err"; text: string } | null) => void) => {
    if (!org) return;
    setSaving(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("org_integrations").upsert(
      { organization_id: org.id, channel, config, is_active: true },
      { onConflict: "organization_id,channel" }
    );
    setMsg(error ? { type: "err", text: error.message } : { type: "ok", text: "Guardado correctamente" });
    setSaving(false);
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

  const deleteOrg = async () => {
    if (!org) return;
    if (!window.confirm(`¿Seguro que querés eliminar "${org.name}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch("/api/admin/delete-org", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: org.id }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      const j = await res.json();
      alert(j.error ?? "Error al eliminar");
    }
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

      {/* ── CANALES META ─────────────────────────────────── */}
      <Section title="Canales de mensajería" icon={<Wifi size={14} color="#c8f135" />}>
        {(() => {
          const webhookUrl = typeof window !== "undefined"
            ? `${window.location.origin}/api/messages/receive/${org.slug}`
            : `/api/messages/receive/${org.slug}`;

          const CopyBtn = ({ value, copied, setCopied }: { value: string; copied: boolean; setCopied: (v: boolean) => void }) => (
            <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {copied ? <Check size={11} color="#c8f135" /> : <Copy size={11} color="#444" />}
            </button>
          );

          const IntField = ({ label, value, onChange, secret, hint, mono }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean; hint?: string; mono?: boolean }) => (
            <div>
              <label style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>{label}</label>
              <input type={secret ? "password" : "text"} value={value} onChange={e => onChange(e.target.value)} placeholder="—"
                style={{ width: "100%", padding: "8px 10px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "7px", color: "#f0f0f0", fontSize: "11px", outline: "none", boxSizing: "border-box", fontFamily: mono ? "monospace" : "inherit" }} />
              {hint && <p style={{ fontSize: "9px", color: "#333", margin: "3px 0 0" }}>{hint}</p>}
            </div>
          );

          return (
            <>
              {/* WhatsApp */}
              <div style={{ background: "#111", borderRadius: "10px", padding: "16px", border: `1px solid ${waConfig.phone_number_id ? "#25D36630" : "#1a1a1a"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: waConfig.phone_number_id && waConfig.access_token ? "#25D366" : "#333" }} />
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>WhatsApp Business</p>
                  </div>
                  <button onClick={() => saveChannel("whatsapp", waConfig as unknown as Record<string, string>, setSavingWa, setMsgWa)} disabled={savingWa}
                    style={{ padding: "5px 12px", background: "#c8f135", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a", opacity: savingWa ? 0.6 : 1 }}>
                    {savingWa ? "Guardando..." : "Guardar"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <IntField label="Phone Number ID" value={waConfig.phone_number_id} onChange={v => setWaConfig({ ...waConfig, phone_number_id: v })} mono hint="Meta Business → WhatsApp → Phone numbers" />
                  <IntField label="App Secret" value={waConfig.app_secret} onChange={v => setWaConfig({ ...waConfig, app_secret: v })} secret mono hint="Meta App → Settings → Basic" />
                </div>
                <IntField label="Access Token permanente" value={waConfig.access_token} onChange={v => setWaConfig({ ...waConfig, access_token: v })} secret mono hint="System User con whatsapp_business_messaging" />
                <div style={{ marginTop: "12px", padding: "10px", background: "#0d0d0d", borderRadius: "7px", border: "1px solid #1a1a1a" }}>
                  <p style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px" }}>Webhook URL</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code style={{ flex: 1, fontSize: "10px", color: "#c8f135", wordBreak: "break-all" }}>{webhookUrl}</code>
                    <CopyBtn value={webhookUrl} copied={copiedWa} setCopied={setCopiedWa} />
                  </div>
                  <p style={{ fontSize: "9px", color: "#333", margin: "5px 0 0" }}>Verify token: <code style={{ color: "#555" }}>{org.slug}</code> · Campo: <code style={{ color: "#555" }}>messages</code></p>
                </div>
                {msgWa && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px", borderRadius: "7px", background: msgWa.type === "ok" ? "#c8f13515" : "#ef444415" }}>
                    {msgWa.type === "ok" ? <CheckCircle size={11} color="#c8f135" /> : <AlertCircle size={11} color="#ef4444" />}
                    <p style={{ fontSize: "10px", color: msgWa.type === "ok" ? "#c8f135" : "#ef4444", margin: 0 }}>{msgWa.text}</p>
                  </div>
                )}
              </div>

              {/* Instagram + Messenger */}
              <div style={{ background: "#111", borderRadius: "10px", padding: "16px", border: `1px solid ${metaConfig.page_id ? "#E1306C30" : "#1a1a1a"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: metaConfig.page_id && metaConfig.page_access_token ? "#E1306C" : "#333" }} />
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Instagram & Messenger</p>
                  </div>
                  <button onClick={() => saveChannel("meta", metaConfig as unknown as Record<string, string>, setSavingMeta, setMsgMeta)} disabled={savingMeta}
                    style={{ padding: "5px 12px", background: "#c8f135", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a", opacity: savingMeta ? 0.6 : 1 }}>
                    {savingMeta ? "Guardando..." : "Guardar"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <IntField label="Page ID" value={metaConfig.page_id} onChange={v => setMetaConfig({ ...metaConfig, page_id: v })} mono hint="Meta Business Suite → Información de la página" />
                  <IntField label="App Secret" value={metaConfig.app_secret} onChange={v => setMetaConfig({ ...metaConfig, app_secret: v })} secret mono hint="Meta App → Settings → Basic" />
                </div>
                <IntField label="Page Access Token permanente" value={metaConfig.page_access_token} onChange={v => setMetaConfig({ ...metaConfig, page_access_token: v })} secret mono hint="Graph API Explorer → seleccioná la página → páginas_mensajes" />
                <div style={{ marginTop: "12px", padding: "10px", background: "#0d0d0d", borderRadius: "7px", border: "1px solid #1a1a1a" }}>
                  <p style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px" }}>Webhook URL</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code style={{ flex: 1, fontSize: "10px", color: "#c8f135", wordBreak: "break-all" }}>{webhookUrl}</code>
                    <CopyBtn value={webhookUrl} copied={copiedMeta} setCopied={setCopiedMeta} />
                  </div>
                  <p style={{ fontSize: "9px", color: "#333", margin: "5px 0 0" }}>Verify token: <code style={{ color: "#555" }}>{org.slug}</code> · Campos: <code style={{ color: "#555" }}>messages, messaging_postbacks</code></p>
                </div>
                {msgMeta && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px", borderRadius: "7px", background: msgMeta.type === "ok" ? "#c8f13515" : "#ef444415" }}>
                    {msgMeta.type === "ok" ? <CheckCircle size={11} color="#c8f135" /> : <AlertCircle size={11} color="#ef4444" />}
                    <p style={{ fontSize: "10px", color: msgMeta.type === "ok" ? "#c8f135" : "#ef4444", margin: 0 }}>{msgMeta.text}</p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
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
        <button
          onClick={deleteOrg}
          style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}
        >
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