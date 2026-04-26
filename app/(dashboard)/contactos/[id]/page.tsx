"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Camera, Plus, X, ChevronDown } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  dni: string | null;
  address: string | null;
  budget: string | null;
  avatar_url: string | null;
  external_id: string | null;
  assigned_to: string | null;
}

interface AgentProfile {
  id: string;
  display_name: string | null;
}

interface CustomFieldDef {
  id: string;
  name: string;
  field_type: "text" | "select" | "multiselect";
  options: string[] | null;
}

interface CustomFieldValue {
  id: string;
  field_id: string;
  value: string;
}

// ── Editable text field ──────────────────────────────────────
function EditableField({
  label, value, onSave, icon, placeholder,
}: {
  label: string; value: string; onSave: (v: string) => void;
  icon?: React.ReactNode; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  const commit = () => { setEditing(false); if (val !== value) onSave(val); };

  return (
    <div>
      <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{label}</p>
      {editing ? (
        <input autoFocus value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
          style={{ width: "100%", background: "#0d0d0d", border: "1px solid var(--accent)", borderRadius: "8px", padding: "9px 12px", color: "#f0f0f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
        />
      ) : (
        <div onClick={() => setEditing(true)}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "8px", cursor: "text", minHeight: "40px", transition: "border-color 0.1s" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"}
        >
          {icon}
          <span style={{ fontSize: "13px", color: val ? "#f0f0f0" : "#333", flex: 1 }}>
            {val || placeholder || "—"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Select (single) ──────────────────────────────────────────
function SelectField({ def, value, onSave }: { def: CustomFieldDef; value: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = def.options ?? [];
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "9px 12px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "8px", cursor: "pointer", minHeight: "40px" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"}
      >
        <span style={{ fontSize: "13px", color: value ? "#f0f0f0" : "#333" }}>{value || "—"}</span>
        <ChevronDown size={12} color="#444" style={{ flexShrink: 0 }} />
      </div>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "4px", zIndex: 50 }}>
            <button onClick={() => { onSave(""); setOpen(false); }}
              style={{ width: "100%", padding: "7px 10px", background: "transparent", border: "none", color: "#444", fontSize: "12px", cursor: "pointer", textAlign: "left", borderRadius: "7px" }}>
              Sin seleccionar
            </button>
            {options.map(opt => (
              <button key={opt} onClick={() => { onSave(opt); setOpen(false); }}
                style={{ width: "100%", padding: "7px 10px", background: value === opt ? "#1e1e1e" : "transparent", border: "none", color: "#f0f0f0", fontSize: "12px", cursor: "pointer", textAlign: "left", borderRadius: "7px" }}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Multi select ─────────────────────────────────────────────
function MultiSelectField({ def, value, onSave }: { def: CustomFieldDef; value: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = def.options ?? [];
  const selected = value ? value.split(",").map(v => v.trim()).filter(Boolean) : [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onSave(next.join(","));
  };

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", padding: "7px 12px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "8px", cursor: "pointer", minHeight: "40px" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"}
      >
        {selected.length > 0 ? selected.map(s => (
          <span key={s} style={{ background: "#c8f13515", color: "#c8f135", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", border: "1px solid #c8f13530" }}>{s}</span>
        )) : <span style={{ fontSize: "13px", color: "#333" }}>—</span>}
        <ChevronDown size={12} color="#444" style={{ marginLeft: "auto", flexShrink: 0 }} />
      </div>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "4px", zIndex: 50 }}>
            {options.map(opt => (
              <button key={opt} onClick={() => toggle(opt)}
                style={{ width: "100%", padding: "7px 10px", background: selected.includes(opt) ? "#c8f13508" : "transparent", border: "none", color: "#f0f0f0", fontSize: "12px", cursor: "pointer", textAlign: "left", borderRadius: "7px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "14px", height: "14px", flexShrink: 0, borderRadius: "4px", border: `1px solid ${selected.includes(opt) ? "var(--accent)" : "#333"}`, background: selected.includes(opt) ? "#c8f13520" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selected.includes(opt) && <div style={{ width: "7px", height: "7px", borderRadius: "2px", background: "var(--accent)" }} />}
                </div>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Avatar con fallback a iniciales ──────────────────────────
function AvatarImage({ contactId, avatarUrl, name, size }: {
  contactId: string; avatarUrl: string | null; name: string; size: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const src = !failed && avatarUrl || null;

  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.22, fontWeight: 700, color: "#f0f0f0", flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Agent dropdown ───────────────────────────────────────────
function AgentDropdown({ agents, value, onSave }: { agents: AgentProfile[]; value: string | null; onSave: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const selected = agents.find(a => a.id === value);
  const initials = (name: string) => name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "8px", cursor: "pointer", minHeight: "40px", transition: "border-color 0.1s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"}
      >
        {selected ? (
          <>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#c8f13520", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700, color: "#c8f135", flexShrink: 0 }}>
              {initials(selected.display_name ?? "?")}
            </div>
            <span style={{ fontSize: "13px", color: "#f0f0f0", flex: 1 }}>{selected.display_name}</span>
          </>
        ) : (
          <span style={{ fontSize: "13px", color: "#333", flex: 1 }}>Sin asignar</span>
        )}
        <ChevronDown size={12} color="#444" style={{ flexShrink: 0 }} />
      </div>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "4px", zIndex: 50 }}>
            <button onClick={() => { onSave(null); setOpen(false); }}
              style={{ width: "100%", padding: "7px 10px", background: "transparent", border: "none", color: "#c8541a", fontSize: "12px", cursor: "pointer", textAlign: "left", borderRadius: "7px" }}>
              Sin asignar
            </button>
            {agents.map(a => (
              <button key={a.id} onClick={() => { onSave(a.id); setOpen(false); }}
                style={{ width: "100%", padding: "7px 10px", background: value === a.id ? "#1e1e1e" : "transparent", border: "none", color: "#f0f0f0", fontSize: "12px", cursor: "pointer", textAlign: "left", borderRadius: "7px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 700, color: "#c8f135", flexShrink: 0 }}>
                  {initials(a.display_name ?? "?")}
                </div>
                {a.display_name ?? a.id.slice(0, 8)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── WhatsApp SVG icon ─────────────────────────────────────────
const WaIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ── Main page ─────────────────────────────────────────────────
export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [customDefs, setCustomDefs] = useState<CustomFieldDef[]>([]);
  const [customValues, setCustomValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalType, setModalType] = useState<"text" | "select" | "multiselect">("text");
  const [modalOptions, setModalOptions] = useState<string[]>([""]);
  const [savingField, setSavingField] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, [id]);

  const init = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const [{ data: c }, { data: defs }, { data: vals }, { data: ag }] = await Promise.all([
        supabase.from("contacts").select("id, name, last_name, phone, email, company, dni, address, budget, avatar_url, external_id, assigned_to").eq("id", id).single(),
        supabase.from("custom_field_definitions").select("*").eq("organization_id", profile.organization_id).order("created_at"),
        supabase.from("custom_field_values").select("*").eq("contact_id", id),
        supabase.from("profiles").select("id, display_name").eq("organization_id", profile.organization_id),
      ]);

      if (c) setContact(c as Contact);
      setCustomDefs((defs as CustomFieldDef[]) ?? []);
      setCustomValues((vals as CustomFieldValue[]) ?? []);
      setAgents((ag as AgentProfile[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field: string, value: string) => {
    const supabase = createClient();
    await supabase.from("contacts").update({ [field]: value }).eq("id", id);
    setContact(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const saveAssignedTo = async (agentId: string | null) => {
    const supabase = createClient();
    await Promise.all([
      supabase.from("contacts").update({ assigned_to: agentId }).eq("id", id),
      supabase.from("conversations").update({ assigned_to: agentId }).eq("contact_id", id),
    ]);
    setContact(prev => prev ? { ...prev, assigned_to: agentId } : prev);
  };

  const saveCustomValue = async (fieldId: string, value: string) => {
    const supabase = createClient();
    const existing = customValues.find(v => v.field_id === fieldId);
    if (existing) {
      await supabase.from("custom_field_values").update({ value }).eq("id", existing.id);
      setCustomValues(prev => prev.map(v => v.field_id === fieldId ? { ...v, value } : v));
    } else {
      const { data } = await supabase.from("custom_field_values")
        .insert({ contact_id: id, field_id: fieldId, value }).select().single();
      if (data) setCustomValues(prev => [...prev, data as CustomFieldValue]);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contact) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${contact.id}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("contact-avatars").upload(path, file, { upsert: true });
    if (error) {
      console.error("Avatar upload error:", error.message);
    } else {
      const { data } = supabase.storage.from("contact-avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("contacts").update({ avatar_url: publicUrl }).eq("id", id);
      setContact(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
    setUploading(false);
    e.target.value = "";
  };

  const saveCustomFieldDef = async () => {
    if (!modalName.trim() || !orgId) return;
    setSavingField(true);
    const supabase = createClient();
    const { data } = await supabase.from("custom_field_definitions").insert({
      organization_id: orgId,
      name: modalName.trim(),
      field_type: modalType,
      options: modalType !== "text" ? modalOptions.filter(o => o.trim()) : null,
    }).select().single();
    if (data) {
      setCustomDefs(prev => [...prev, data as CustomFieldDef]);
      setShowModal(false);
      setModalName("");
      setModalType("text");
      setModalOptions([""]);
    }
    setSavingField(false);
  };

  const getCustomValue = (fieldId: string) => customValues.find(v => v.field_id === fieldId)?.value ?? "";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  if (!contact) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Contacto no encontrado</p>
    </div>
  );

  const fullName = [contact.name, contact.last_name].filter(Boolean).join(" ");

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0a0a" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* Back */}
        <button onClick={() => router.push("/contactos")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: "#555", fontSize: "12px", cursor: "pointer", marginBottom: "28px", padding: 0 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f0f0f0"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#555"}
        >
          <ArrowLeft size={14} />
          Contactos
        </button>

        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer", border: "2px solid #1e1e1e", borderRadius: "50%" }}>
              <AvatarImage contactId={contact.id} avatarUrl={contact.avatar_url} name={fullName} size={88} />
            </div>
            {uploading && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "20px", height: "20px", border: "2px solid #333", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              </div>
            )}
            <button onClick={() => fileInputRef.current?.click()}
              style={{ position: "absolute", bottom: "2px", right: "2px", width: "24px", height: "24px", borderRadius: "50%", background: "#1a1a1a", border: "2px solid #0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
              <Camera size={11} color="#888" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </div>

          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>{fullName || "Sin nombre"}</h1>
            {contact.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <WaIcon />
                <span style={{ fontSize: "13px", color: "#555" }}>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "24px", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 20px" }}>Información</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <EditableField label="Nombre" value={contact.name ?? ""} onSave={v => saveField("name", v)} />
            <EditableField label="WhatsApp" value={contact.phone ?? ""} onSave={v => saveField("phone", v)} icon={<WaIcon />} />
            <EditableField label="Email" value={contact.email ?? ""} onSave={v => saveField("email", v)} />
            <EditableField label="DNI" value={contact.dni ?? ""} onSave={v => saveField("dni", v)} />
            <EditableField label="Empresa" value={contact.company ?? ""} onSave={v => saveField("company", v)} />
            <EditableField label="Dirección" value={contact.address ?? ""} onSave={v => saveField("address", v)} />
            <EditableField label="Presupuesto de Interés" value={contact.budget ?? ""} onSave={v => saveField("budget", v)} />
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Usuario Responsable</p>
              <AgentDropdown agents={agents} value={contact.assigned_to} onSave={saveAssignedTo} />
            </div>
          </div>
        </div>

        {/* Custom fields section */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Campos personalizados</p>
            <button onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", background: "#c8f13510", border: "1px solid #c8f13530", color: "#c8f135", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
              <Plus size={11} />
              Campo
            </button>
          </div>

          {customDefs.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#333", textAlign: "center", padding: "20px 0" }}>
              No hay campos personalizados. Agregá el primero.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {customDefs.map(def => (
                <div key={def.id}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{def.name}</p>
                  {def.field_type === "text" && (
                    <EditableField label="" value={getCustomValue(def.id)} onSave={v => saveCustomValue(def.id, v)} />
                  )}
                  {def.field_type === "select" && (
                    <SelectField def={def} value={getCustomValue(def.id)} onSave={v => saveCustomValue(def.id, v)} />
                  )}
                  {def.field_type === "multiselect" && (
                    <MultiSelectField def={def} value={getCustomValue(def.id)} onSave={v => saveCustomValue(def.id, v)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal — agregar custom field */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "28px", width: "420px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Nuevo campo personalizado</h3>
              <button onClick={() => setShowModal(false)}
                style={{ width: "26px", height: "26px", borderRadius: "6px", background: "transparent", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555", padding: 0 }}
                onMouseEnter={e => { (e.currentTarget).style.background = "#1e1e1e"; (e.currentTarget).style.color = "#f0f0f0"; }}
                onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "#555"; }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Nombre */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 7px" }}>Nombre del campo</p>
              <input autoFocus value={modalName} onChange={e => setModalName(e.target.value)}
                placeholder="Ej: Fecha de cierre, Prioridad..."
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "9px 12px", color: "#f0f0f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.currentTarget).style.borderColor = "var(--accent)"}
                onBlur={e => (e.currentTarget).style.borderColor = "#2a2a2a"}
              />
            </div>

            {/* Tipo */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Tipo</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {([
                  { key: "text", label: "Texto" },
                  { key: "select", label: "Selección única" },
                  { key: "multiselect", label: "Multi selección" },
                ] as { key: "text" | "select" | "multiselect"; label: string }[]).map(t => (
                  <button key={t.key} onClick={() => setModalType(t.key)}
                    style={{ flex: 1, padding: "7px 6px", borderRadius: "8px", border: `1px solid ${modalType === t.key ? "#c8f13540" : "#2a2a2a"}`, background: modalType === t.key ? "#c8f13510" : "transparent", color: modalType === t.key ? "#c8f135" : "#555", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones (select / multiselect) */}
            {(modalType === "select" || modalType === "multiselect") && (
              <div>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Opciones</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {modalOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: "6px" }}>
                      <input value={opt} onChange={e => setModalOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Opción ${i + 1}`}
                        style={{ flex: 1, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 10px", color: "#f0f0f0", fontSize: "12px", outline: "none" }}
                        onFocus={e => (e.currentTarget).style.borderColor = "var(--accent)"}
                        onBlur={e => (e.currentTarget).style.borderColor = "#2a2a2a"}
                      />
                      {modalOptions.length > 1 && (
                        <button onClick={() => setModalOptions(prev => prev.filter((_, j) => j !== i))}
                          style={{ width: "32px", height: "32px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#555", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setModalOptions(prev => [...prev, ""])}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px", borderRadius: "8px", background: "transparent", border: "1px dashed #2a2a2a", color: "#555", fontSize: "11px", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = "#444"; (e.currentTarget).style.color = "#888"; }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = "#2a2a2a"; (e.currentTarget).style.color = "#555"; }}
                  >
                    <Plus size={11} /> Agregar opción
                  </button>
                </div>
              </div>
            )}

            {/* Save */}
            <button onClick={saveCustomFieldDef} disabled={!modalName.trim() || savingField}
              style={{ padding: "11px", borderRadius: "10px", background: modalName.trim() ? "var(--accent)" : "#1e1e1e", border: "none", color: modalName.trim() ? "#0a0a0a" : "#444", fontSize: "13px", fontWeight: 700, cursor: modalName.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
              {savingField ? "Guardando..." : "Guardar campo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
