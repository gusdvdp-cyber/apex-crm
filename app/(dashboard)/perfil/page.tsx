"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, User, Mail, Lock, Check } from "lucide-react";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  organization_id: string;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [savedPass, setSavedPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [form, setForm] = useState({ full_name: "" });
  const [passForm, setPassForm] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");

    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role, organization_id")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setForm({ full_name: data.full_name ?? "" });
    }
    setLoading(false);
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ full_name: form.full_name }).eq("id", user.id);
    setSavingInfo(false);
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 2000);
  };

  const savePassword = async () => {
    setPassError("");
    if (passForm.new !== passForm.confirm) { setPassError("Las contraseñas no coinciden"); return; }
    if (passForm.new.length < 6) { setPassError("Mínimo 6 caracteres"); return; }
    setSavingPass(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: passForm.new });
    if (error) { setPassError(error.message); setSavingPass(false); return; }
    setPassForm({ current: "", new: "", confirm: "" });
    setSavingPass(false);
    setSavedPass(true);
    setTimeout(() => setSavedPass(false), 2000);
  };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin", admin: "Admin", member: "Miembro",
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ padding: "32px 24px", maxWidth: "560px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, color: "#0a0a0a", flexShrink: 0 }}>
          {form.full_name ? initials(form.full_name) : <User size={22} color="#0a0a0a" />}
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>
            {form.full_name || "Mi perfil"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#444" }}>{email}</span>
            <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px", background: "var(--accent)18", color: "var(--accent)" }}>
              {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Info personal */}
      <Section title="Información personal" icon={<User size={14} color="var(--accent)" />}>
        <Field label="Nombre completo">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Tu nombre"
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input value={email} disabled style={{ ...inputStyle, opacity: 0.4, cursor: "not-allowed" }} />
          <p style={{ fontSize: "10px", color: "#333", margin: "4px 0 0" }}>El email no se puede cambiar desde aquí.</p>
        </Field>
        <button
          onClick={saveInfo}
          disabled={savingInfo}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "9px", background: savedInfo ? "#1a3a0a" : "var(--accent)", border: savedInfo ? "1px solid var(--accent)" : "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: savedInfo ? "var(--accent)" : "#0a0a0a", transition: "all 0.2s", alignSelf: "flex-start" }}
        >
          {savedInfo ? <><Check size={13} /> Guardado</> : <><Save size={13} /> Guardar cambios</>}
        </button>
      </Section>

      {/* Contraseña */}
      <Section title="Cambiar contraseña" icon={<Lock size={14} color="var(--accent)" />}>
        <Field label="Nueva contraseña">
          <input
            type="password"
            value={passForm.new}
            onChange={(e) => setPassForm({ ...passForm, new: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            style={inputStyle}
          />
        </Field>
        <Field label="Confirmar contraseña">
          <input
            type="password"
            value={passForm.confirm}
            onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
            placeholder="Repetí la nueva contraseña"
            style={inputStyle}
          />
        </Field>
        {passError && (
          <p style={{ fontSize: "11px", color: "#ff4444", margin: 0 }}>{passError}</p>
        )}
        <button
          onClick={savePassword}
          disabled={savingPass || !passForm.new || !passForm.confirm}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "9px", background: savedPass ? "#1a3a0a" : "var(--accent)", border: savedPass ? "1px solid var(--accent)" : "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: savedPass ? "var(--accent)" : "#0a0a0a", transition: "all 0.2s", alignSelf: "flex-start", opacity: !passForm.new || !passForm.confirm ? 0.5 : 1 }}
        >
          {savedPass ? <><Check size={13} /> Actualizada</> : <><Lock size={13} /> Actualizar contraseña</>}
        </button>
      </Section>

    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {icon}
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{title}</p>
      </div>
      {children}
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
  boxSizing: "border-box",
};