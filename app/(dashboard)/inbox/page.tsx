"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Filter, MessageCircle, Mail, MoreVertical,
  Send, Paperclip, Smile, Phone, Video,
} from "lucide-react";

type Channel = "whatsapp" | "instagram" | "messenger" | "gmail" | "outlook";
type Tab = "social" | "email";

interface Message {
  id: string;
  from_type: "contact" | "me";
  text: string;
  created_at: string;
  external_id: string | null;
}

interface Conversation {
  id: string;
  channel: Channel;
  last_message: string | null;
  unread_count: number;
  is_online: boolean;
  updated_at: string;
  external_id: string | null;
  contacts?: { name: string; phone: string | null; email: string | null } | null;
}

const SOCIAL_CHANNELS: Channel[] = ["whatsapp", "instagram", "messenger"];
const EMAIL_CHANNELS: Channel[] = ["gmail", "outlook"];

function ChannelIcon({ channel, size = 12 }: { channel: Channel; size?: number }) {
  const configs: Record<Channel, { bg: string; svg: React.ReactNode }> = {
    whatsapp: { bg: "#25D366", svg: <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> },
    instagram: { bg: "#E1306C", svg: <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg> },
    messenger: { bg: "#0099FF", svg: <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z" /></svg> },
    gmail: { bg: "#EA4335", svg: <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z" /></svg> },
    outlook: { bg: "#0072C6", svg: <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M24 7.387v10.478L19.2 21V9.196L24 7.387zM0 7.763l8.4 2.19V19.8L0 17.61V7.763zm9.6 2.487l9.6-2.565V20.4l-9.6 2.4V10.25zM8.4 4.2L0 6.6l8.4 2.19V4.2zm1.2 0v4.59L24 5.55 13.2 2.4 9.6 4.2z" /></svg> },
  };
  const c = configs[channel];
  return (
    <div style={{ width: size + 8, height: size + 8, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {c.svg}
    </div>
  );
}

const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
};

export default function InboxPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("social");
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) return;
    setOrgId(profile.organization_id);
    await fetchConversations(profile.organization_id);
    setupRealtime(profile.organization_id);
    setLoading(false);
  };

  const fetchConversations = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("*, contacts(name, phone, email)")
      .eq("organization_id", oid)
      .order("updated_at", { ascending: false });
    const convs = (data as Conversation[]) ?? [];
    setConversations(convs);
    if (convs.length > 0 && !selected) {
      setSelected(convs[0]);
      fetchMessages(convs[0].id);
    }
  };

  const fetchMessages = async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  };

  const setupRealtime = (oid: string) => {
    const supabase = createClient();

    // Realtime en mensajes nuevos
    supabase
      .channel("inbox-messages")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          if (selected?.id && prev[0] && prev[0].id) {
            // Solo agregamos si pertenece a la conv seleccionada
          }
          return [...prev, newMsg];
        });
      })
      .subscribe();

    // Realtime en conversaciones
    supabase
      .channel("inbox-conversations")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `organization_id=eq.${oid}`,
      }, () => {
        fetchConversations(oid);
      })
      .subscribe();
  };

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    fetchMessages(conv.id);
    // Marcar como leído
    const supabase = createClient();
    supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected || sending) return;
    setSending(true);

    // Extraer recipientId del external_id de la conversación
    // formato: pageId_contactId
    const parts = selected.external_id?.split("_") ?? [];
    const recipientId = parts[parts.length - 1] ?? "";

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selected.id,
        text: newMessage,
        channel: selected.channel,
        recipientId,
      }),
    });

    if (res.ok) {
      setNewMessage("");
      fetchMessages(selected.id);
    }
    setSending(false);
  };

  const filtered = conversations.filter((c) => {
    const channels = activeTab === "social" ? SOCIAL_CHANNELS : EMAIL_CHANNELS;
    const matchChannel = channels.includes(c.channel);
    const name = c.contacts?.name ?? c.external_id ?? "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    return matchChannel && matchSearch;
  });

  const contactName = (conv: Conversation) => conv.contacts?.name ?? conv.external_id?.split("_").pop() ?? "Desconocido";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando inbox...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>

      {/* Panel izquierdo */}
      <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", borderRight: "1px solid #1a1a1a" }}>
        <div style={{ padding: "24px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Inbox</h1>
            <button style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#161616", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Filter size={13} color="#444" />
            </button>
          </div>

          <div style={{ display: "flex", background: "#111", borderRadius: "10px", padding: "3px", gap: "3px", marginBottom: "12px" }}>
            {(["social", "email"] as Tab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: activeTab === tab ? "#1e1e1e" : "transparent", color: activeTab === tab ? "#f0f0f0" : "#444", transition: "all 0.15s ease" }}>
                {tab === "social" ? <MessageCircle size={12} /> : <Mail size={12} />}
                {tab === "social" ? "Social" : "Email"}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#333" style={{ position: "absolute", left: "10px" }} />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#333", fontSize: "12px", padding: "40px 0" }}>
              Sin conversaciones
            </p>
          )}
          {filtered.map((conv) => {
            const isSelected = conv.id === selected?.id;
            const name = contactName(conv);
            return (
              <button key={conv.id} onClick={() => selectConversation(conv)}
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px", borderRadius: "10px", border: isSelected ? "1px solid #c8f13520" : "1px solid transparent", background: isSelected ? "#c8f13508" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: "2px", transition: "all 0.1s ease" }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#141414"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#f0f0f0" }}>
                    {initials(name)}
                  </div>
                  {conv.is_online && (
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: "9px", height: "9px", borderRadius: "50%", background: "#c8f135", border: "2px solid #0d0d0d" }} />
                  )}
                  <div style={{ position: "absolute", bottom: "-2px", right: "-4px" }}>
                    <ChannelIcon channel={conv.channel} size={9} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>{name}</span>
                    <span style={{ fontSize: "10px", color: "#333", flexShrink: 0, marginLeft: "8px" }}>{fmtTime(conv.updated_at)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <p style={{ fontSize: "11px", color: conv.unread_count > 0 ? "#aaa" : "#444", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, fontWeight: conv.unread_count > 0 ? 500 : 400 }}>
                      {conv.last_message ?? ""}
                    </p>
                    {conv.unread_count > 0 && (
                      <span style={{ background: "#c8f135", color: "#0a0a0a", fontSize: "9px", fontWeight: 800, borderRadius: "20px", padding: "1px 6px", flexShrink: 0 }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel chat */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 24px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#f0f0f0" }}>
                {initials(contactName(selected))}
              </div>
              <div style={{ position: "absolute", bottom: "-2px", right: "-4px" }}>
                <ChannelIcon channel={selected.channel} size={9} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{contactName(selected)}</p>
              <p style={{ fontSize: "10px", color: "#444", margin: "2px 0 0" }}>
                vía {selected.channel.charAt(0).toUpperCase() + selected.channel.slice(1)}
              </p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[Phone, Video, MoreVertical].map((Icon, i) => (
                <button key={i} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Icon size={14} color="#444" />
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.from_type === "me" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "60%", padding: "10px 14px", background: msg.from_type === "me" ? "var(--accent)" : "#161616", color: msg.from_type === "me" ? "#0a0a0a" : "#f0f0f0", borderRadius: msg.from_type === "me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: "13px", lineHeight: "1.5" }}>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.5, textAlign: "right" }}>
                    {fmtTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: "16px 24px", background: "#0d0d0d", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px" }}>
              <Paperclip size={15} color="#333" style={{ cursor: "pointer" }} />
              <input type="text" placeholder="Escribí un mensaje..." value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0f0f0", fontSize: "13px" }} />
              <Smile size={15} color="#333" style={{ cursor: "pointer" }} />
              <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: newMessage.trim() ? "var(--accent)" : "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s ease", opacity: sending ? 0.6 : 1 }}>
                <Send size={13} color={newMessage.trim() ? "#0a0a0a" : "#444"} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "13px", color: "#333" }}>Seleccioná una conversación</p>
        </div>
      )}
    </div>
  );
}