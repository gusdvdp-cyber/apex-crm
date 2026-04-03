"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Phone, Mail, MoreVertical, Filter, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  tag: string;
  tag_color: string;
  avatar: string;
}

const avatarColors = ["#c8f135", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (data) setContacts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>

      {/* Lista */}
      <div style={{
        width: selected ? "560px" : "100%", flexShrink: 0,
        display: "flex", flexDirection: "column", height: "100%",
        background: "#0d0d0d", borderRight: selected ? "1px solid #1a1a1a" : "none",
        transition: "width 0.2s ease",
      }}>

        {/* Header */}
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Contactos</h1>
              <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>{contacts.length} contactos</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Filter size={13} color="#444" />
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "32px", borderRadius: "8px", background: "#c8f135", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
                <Plus size={13} />
                Nuevo
              </button>
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#333" style={{ position: "absolute", left: "10px" }} />
            <input
              type="text"
              placeholder="Buscar por nombre o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none" }}
            />
          </div>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px" }}>
              <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                  {["Nombre", "Empresa", "Teléfono", "Etiqueta", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 24px", fontSize: "10px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact, i) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelected(selected?.id === contact.id ? null : contact)}
                    style={{
                      borderBottom: "1px solid #161616",
                      background: selected?.id === contact.id ? "#c8f13508" : "transparent",
                      cursor: "pointer", transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => { if (selected?.id !== contact.id) (e.currentTarget as HTMLElement).style.background = "#141414"; }}
                    onMouseLeave={(e) => { if (selected?.id !== contact.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: avatarColors[i % avatarColors.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#0a0a0a", flexShrink: 0 }}>
                          {contact.avatar}
                        </div>
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{contact.name}</p>
                          <p style={{ fontSize: "10px", color: "#444", margin: 0 }}>{contact.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 24px", fontSize: "12px", color: "#555" }}>{contact.company}</td>
                    <td style={{ padding: "12px 24px", fontSize: "12px", color: "#555" }}>{contact.phone}</td>
                    <td style={{ padding: "12px 24px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: contact.tag_color + "20", color: contact.tag_color, letterSpacing: "0.04em" }}>
                        {contact.tag}
                      </span>
                    </td>
                    <td style={{ padding: "12px 24px" }}>
                      <button style={{ width: "24px", height: "24px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MoreVertical size={13} color="#333" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel detalle */}
      {selected && (
        <div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px", background: "#0a0a0a" }}>
          <div style={{ background: "#0d0d0d", borderRadius: "16px", border: "1px solid #1a1a1a", padding: "24px" }}>

            {/* Header detalle */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "24px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: avatarColors[contacts.findIndex(c => c.id === selected.id) % avatarColors.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#0a0a0a", flexShrink: 0 }}>
                {selected.avatar}
              </div>
              <div style={{ flex: 1, marginLeft: "14px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{selected.name}</h2>
                <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>{selected.company}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: selected.tag_color + "20", color: selected.tag_color }}>
                  {selected.tag}
                </span>
                <button onClick={() => setSelected(null)} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#161616", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={13} color="#444" />
                </button>
              </div>
            </div>

            {/* Divisor */}
            <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "20px" }} />

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: Mail, label: "Email", value: selected.email },
                { icon: Phone, label: "Teléfono", value: selected.phone },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#111", borderRadius: "10px", border: "1px solid #1a1a1a" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#c8f13515", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="#c8f135" />
                  </div>
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 600, color: "#444", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#f0f0f0", margin: "2px 0 0" }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#c8f135", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}>
                Enviar mensaje
              </button>
              <button style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>
                Editar contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}