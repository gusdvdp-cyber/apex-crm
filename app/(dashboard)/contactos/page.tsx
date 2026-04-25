"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Contact {
  id: string;
  name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
}

const mkInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

export default function ContactosPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("contacts")
          .select("id, name, last_name, phone, email, company, avatar_url")
          .order("created_at", { ascending: false });
        if (data) setContacts(data as Contact[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.last_name ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a" }}>

      {/* Header */}
      <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Contactos</h1>
            <p style={{ fontSize: "11px", color: "#444", margin: "3px 0 0" }}>{contacts.length} contactos</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Filter size={13} color="#444" />
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "32px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
              <Plus size={13} /> Nuevo
            </button>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <Search size={13} color="#333" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          <input type="text" placeholder="Buscar por nombre, empresa o teléfono..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 10px 8px 32px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px" }}>
            <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px" }}>
            <p style={{ fontSize: "12px", color: "#444" }}>Sin resultados</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Nombre", "Empresa", "Teléfono", "Email"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 24px", fontSize: "10px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => {
                const fullName = [contact.name, contact.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={contact.id}
                    onClick={() => router.push(`/contactos/${contact.id}`)}
                    style={{ borderBottom: "1px solid #161616", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#141414"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt={fullName}
                            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <img src={`https://picsum.photos/seed/${contact.id}/64/64`} alt={fullName}
                            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{fullName || "Sin nombre"}</p>
                          {contact.email && <p style={{ fontSize: "10px", color: "#444", margin: 0 }}>{contact.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 24px", fontSize: "12px", color: "#555" }}>{contact.company || "—"}</td>
                    <td style={{ padding: "12px 24px", fontSize: "12px", color: "#555" }}>{contact.phone || "—"}</td>
                    <td style={{ padding: "12px 24px", fontSize: "12px", color: "#555" }}>{contact.email || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
