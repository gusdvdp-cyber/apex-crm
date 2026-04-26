"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, CheckCircle, AlertCircle, Wifi } from "lucide-react";

type ChannelKey = "whatsapp" | "chatwoot";

interface WaConfig {
  evolution_url: string;
  evolution_api_key: string;
  evolution_instance: string;
}

interface ChatwootConfig {
  chatwoot_url: string;
  chatwoot_api_token: string;
  chatwoot_account_id: string;
}

const EMPTY_WA: WaConfig = { evolution_url: "", evolution_api_key: "", evolution_instance: "" };
const EMPTY_CT: ChatwootConfig = { chatwoot_url: "", chatwoot_api_token: "", chatwoot_account_id: "" };

function Field({ label, value, onChange, placeholder, type = "text", mono = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: "9px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 11px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box", fontFamily: mono ? "monospace" : "inherit" }}
      />
    </div>
  );
}

function Section({ title, icon, active, color, children, saving, onSave, msg }: {
  title: string; icon: React.ReactNode; active: boolean; color: string;
  children: React.ReactNode; saving: boolean; onSave: () => void;
  msg: { type: "ok" | "err"; text: string } | null;
}) {
  return (
    <div style={{ background: "#0d0d0d", border: `1px solid ${active ? color + "40" : "#1a1a1a"}`, borderRadius: "12px", padding: "20px", marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{title}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: active ? "#c8f135" : "#333" }} />
              <span style={{ fontSize: "10px", color: active ? "#c8f135" : "#444" }}>{active ? "Configurado" : "Sin configurar"}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#c8f135", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}
        >
          <Save size={11} />
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>

      {msg && (
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "7px", padding: "8px 12px", borderRadius: "8px", background: msg.type === "ok" ? "#c8f13515" : "#ef444415" }}>
          {msg.type === "ok" ? <CheckCircle size={12} color="#c8f135" /> : <AlertCircle size={12} color="#ef4444" />}
          <p style={{ fontSize: "11px", color: msg.type === "ok" ? "#c8f135" : "#ef4444", margin: 0 }}>{msg.text}</p>
        </div>
      )}
    </div>
  );
}

export default function CanalesPage() {
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  const [wa, setWa] = useState<WaConfig>(EMPTY_WA);
  const [ct, setCt] = useState<ChatwootConfig>(EMPTY_CT);

  const [savingWa, setSavingWa] = useState(false);
  const [savingCt, setSavingCt] = useState(false);
  const [msgWa, setMsgWa] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [msgCt, setMsgCt] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const { data: integrations } = await supabase
        .from("org_integrations")
        .select("channel, config")
        .eq("organization_id", profile.organization_id);

      (integrations ?? []).forEach((row: { channel: string; config: Record<string, string> }) => {
        if (row.channel === "whatsapp") setWa({ evolution_url: row.config.evolution_url ?? "", evolution_api_key: row.config.evolution_api_key ?? "", evolution_instance: row.config.evolution_instance ?? "" });
        if (row.channel === "chatwoot") setCt({ chatwoot_url: row.config.chatwoot_url ?? "", chatwoot_api_token: row.config.chatwoot_api_token ?? "", chatwoot_account_id: row.config.chatwoot_account_id ?? "" });
      });

      setLoading(false);
    };
    load();
  }, []);

  const save = async (channel: ChannelKey, config: Record<string, string>, setSaving: (v: boolean) => void, setMsg: (v: { type: "ok" | "err"; text: string } | null) => void) => {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("org_integrations").upsert(
      { organization_id: orgId, channel, config, is_active: true },
      { onConflict: "organization_id,channel" }
    );
    setMsg(error ? { type: "err", text: error.message } : { type: "ok", text: "Configuración guardada correctamente" });
    setSaving(false);
  };

  const waActive = !!(wa.evolution_url && wa.evolution_api_key && wa.evolution_instance);
  const ctActive = !!(ct.chatwoot_url && ct.chatwoot_api_token && ct.chatwoot_account_id);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0a0a" }}>
      <div style={{ padding: "28px", maxWidth: "680px" }}>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Canales</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>
            Conectá los canales de mensajería para esta organización. Cada org tiene sus propias credenciales.
          </p>
        </div>

        {/* WhatsApp — Evolution API */}
        <Section
          title="WhatsApp"
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
          active={waActive}
          color="#25D366"
          saving={savingWa}
          onSave={() => save("whatsapp", wa as unknown as Record<string, string>, setSavingWa, setMsgWa)}
          msg={msgWa}
        >
          <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px" }}>Vía Evolution API — una instancia de WhatsApp por organización.</p>
          <Field label="URL de Evolution API" value={wa.evolution_url} onChange={v => setWa({ ...wa, evolution_url: v })} placeholder="https://tu-evolution-api.com" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="API Key" value={wa.evolution_api_key} onChange={v => setWa({ ...wa, evolution_api_key: v })} placeholder="xxxxxxxxxxxxxxxx" mono />
            <Field label="Nombre de instancia" value={wa.evolution_instance} onChange={v => setWa({ ...wa, evolution_instance: v })} placeholder="MiEmpresa" />
          </div>
        </Section>

        {/* Instagram + Messenger — Chatwoot */}
        <Section
          title="Instagram & Messenger"
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>}
          active={ctActive}
          color="#E1306C"
          saving={savingCt}
          onSave={() => save("chatwoot", ct as unknown as Record<string, string>, setSavingCt, setMsgCt)}
          msg={msgCt}
        >
          <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px" }}>Vía Chatwoot — conecta Instagram Direct y Messenger.</p>
          <Field label="URL de Chatwoot" value={ct.chatwoot_url} onChange={v => setCt({ ...ct, chatwoot_url: v })} placeholder="https://tu-chatwoot.com" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="API Token" value={ct.chatwoot_api_token} onChange={v => setCt({ ...ct, chatwoot_api_token: v })} placeholder="xxxxxxxxxxxxxx" mono />
            <Field label="Account ID" value={ct.chatwoot_account_id} onChange={v => setCt({ ...ct, chatwoot_account_id: v })} placeholder="3" />
          </div>
        </Section>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px 14px", background: "#111", borderRadius: "10px", border: "1px solid #1a1a1a" }}>
          <Wifi size={13} color="#444" style={{ marginTop: "1px", flexShrink: 0 }} />
          <p style={{ fontSize: "10px", color: "#444", margin: 0, lineHeight: 1.5 }}>
            Las credenciales se guardan encriptadas en la base de datos y se usan solo para enviar mensajes desde el inbox.
            Cada organización tiene sus propias conexiones independientes.
          </p>
        </div>

      </div>
    </div>
  );
}
