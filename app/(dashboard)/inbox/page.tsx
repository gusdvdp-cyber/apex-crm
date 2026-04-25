"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search, MessageCircle, Mail, MoreVertical,
  Send, Paperclip, Smile, UserCheck, Activity, ChevronDown, X,
} from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";

type Channel = "whatsapp" | "instagram" | "messenger" | "gmail" | "outlook";
type Tab = "social" | "email";
type ConvFilter = "all" | "mine" | "unassigned" | "new";

interface AgentProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  from_type: "contact" | "me";
  text: string;
  created_at: string;
  external_id: string | null;
  media_url?: string | null;
  media_type?: string | null;
  sent_by?: string | null;
  sender?: AgentProfile | null;
}

interface ActivityEntry {
  id: string;
  action_type: string;
  description: string;
  performer?: AgentProfile | null;
  created_at: string;
}

type TimelineItem =
  | { type: "message"; ts: string; data: Message }
  | { type: "activity"; ts: string; data: ActivityEntry };

interface Conversation {
  id: string;
  channel: Channel;
  last_message: string | null;
  unread_count: number;
  is_online: boolean;
  updated_at: string;
  external_id: string | null;
  assigned_to: string | null;
  contacts?: { id: string; name: string; phone: string | null; email: string | null } | null;
  agent?: AgentProfile | null;
}

interface ContactPanel {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  conversationId: string;
}

const SOCIAL_CHANNELS: Channel[] = ["whatsapp", "instagram", "messenger"];
const EMAIL_CHANNELS: Channel[] = ["gmail", "outlook"];
const CONV_FILTERS: { key: ConvFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "mine", label: "Míos" },
  { key: "unassigned", label: "Sin asignar" },
  { key: "new", label: "Nuevos" },
];

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

function MessageContent({ msg }: { msg: Message }) {
  const isMe = msg.from_type === "me";
  const color = isMe ? "#0a0a0a" : "#f0f0f0";

  if (msg.media_type === "image" && msg.media_url) {
    return (
      <>
        <img src={msg.media_url} alt="imagen" style={{ maxWidth: "100%", borderRadius: "8px", display: "block" }} />
        {msg.text && msg.text !== "[imagen]" && (
          <p style={{ margin: "6px 0 0", color }}>{msg.text}</p>
        )}
      </>
    );
  }

  if (msg.media_type === "audio" && msg.media_url) {
    return <audio controls src={msg.media_url} style={{ width: "100%", minWidth: "200px" }} />;
  }

  return <p style={{ margin: 0, color }}>{msg.text}</p>;
}

function ContactField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  const save = () => {
    setEditing(false);
    if (val !== value) onSave(val);
  };

  return (
    <div>
      <p style={{ fontSize: "10px", color: "#444", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 5px" }}>{label}</p>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
          style={{ width: "100%", background: "#111", border: "1px solid var(--accent)", borderRadius: "6px", padding: "7px 10px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ padding: "7px 10px", borderRadius: "6px", background: "#111", border: "1px solid #1a1a1a", cursor: "text", color: val ? "#f0f0f0" : "#333", fontSize: "12px", transition: "border-color 0.1s ease" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
        >
          {val || `Agregar ${label.toLowerCase()}...`}
        </div>
      )}
    </div>
  );
}

const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
};

export default function InboxPage() {
  const { setCollapsed } = useSidebar();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("social");
  const [convFilter, setConvFilter] = useState<ConvFilter>("all");
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [contactPanel, setContactPanel] = useState<ContactPanel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [timeline]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssignDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) return;
    setOrgId(profile.organization_id);
    await Promise.all([
      fetchConversations(profile.organization_id),
      fetchAgents(profile.organization_id),
    ]);
    setupRealtime(profile.organization_id);
    setLoading(false);
  };

  const fetchAgents = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("organization_id", oid);
    setAgents((data as AgentProfile[]) ?? []);
  };

  const fetchConversations = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("*, contacts(id, name, phone, email), agent:profiles!assigned_to(id, display_name, avatar_url)")
      .eq("organization_id", oid)
      .order("updated_at", { ascending: false });
    const convs = (data as Conversation[]) ?? [];
    setConversations(convs);
    if (convs.length > 0 && !selected) {
      setSelected(convs[0]);
      fetchTimeline(convs[0].id);
    }
  };

  const fetchTimeline = async (convId: string) => {
    const supabase = createClient();
    const [{ data: msgs }, { data: logs }] = await Promise.all([
      supabase
        .from("messages")
        .select("*, sender:profiles!sent_by(id, display_name, avatar_url)")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true }),
      supabase
        .from("activity_log")
        .select("*, performer:profiles!performed_by(id, display_name, avatar_url)")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true }),
    ]);
    const items: TimelineItem[] = [
      ...(msgs ?? []).map(m => ({ type: "message" as const, ts: m.created_at, data: m as Message })),
      ...(logs ?? []).map(l => ({ type: "activity" as const, ts: l.created_at, data: l as ActivityEntry })),
    ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    setTimeline(items);
  };

  const setupRealtime = (oid: string) => {
    const supabase = createClient();

    supabase.channel("inbox-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        setTimeline(prev => {
          if (prev.find(i => i.type === "message" && i.data.id === msg.id)) return prev;
          return [...prev, { type: "message", ts: msg.created_at, data: msg }];
        });
      })
      .subscribe();

    supabase.channel("inbox-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        const log = payload.new as ActivityEntry;
        setTimeline(prev => {
          if (prev.find(i => i.type === "activity" && i.data.id === log.id)) return prev;
          return [...prev, { type: "activity", ts: log.created_at, data: log }];
        });
      })
      .subscribe();

    supabase.channel("inbox-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `organization_id=eq.${oid}` }, () => {
        fetchConversations(oid);
      })
      .subscribe();
  };

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    setShowAssignDropdown(false);
    fetchTimeline(conv.id);
    const supabase = createClient();
    supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const openContactPanel = (conv: Conversation) => {
    if (!conv.contacts?.id) return;
    setContactPanel({
      contactId: conv.contacts.id,
      name: conv.contacts.name,
      phone: conv.contacts.phone,
      email: conv.contacts.email,
      conversationId: conv.id,
    });
    setCollapsed(true);
  };

  const closeContactPanel = () => {
    setContactPanel(null);
    setCollapsed(false);
  };

  const saveContactField = async (field: "name" | "phone" | "email", value: string) => {
    if (!contactPanel || !orgId || !currentUserId) return;
    const supabase = createClient();
    await Promise.all([
      supabase.from("contacts").update({ [field]: value }).eq("id", contactPanel.contactId),
      supabase.from("activity_log").insert({
        organization_id: orgId,
        conversation_id: contactPanel.conversationId,
        contact_id: contactPanel.contactId,
        performed_by: currentUserId,
        action_type: "contact_updated",
        description: `Campo "${field}" actualizado`,
      }),
    ]);
    setContactPanel(prev => prev ? { ...prev, [field]: value } : prev);
    setConversations(prev => prev.map(c =>
      c.id === contactPanel.conversationId && c.contacts
        ? { ...c, contacts: { ...c.contacts, [field]: value } }
        : c
    ));
  };

  const assignConversation = async (agentId: string | null) => {
    if (!selected || !orgId || !currentUserId) return;
    const supabase = createClient();
    const agent = agents.find(a => a.id === agentId) ?? null;
    const desc = agentId
      ? `Conversación asignada a ${agent?.display_name ?? "agente"}`
      : "Conversación desasignada";

    await Promise.all([
      supabase.from("conversations").update({ assigned_to: agentId }).eq("id", selected.id),
      supabase.from("activity_log").insert({
        organization_id: orgId,
        conversation_id: selected.id,
        performed_by: currentUserId,
        action_type: "conversation_assigned",
        description: desc,
      }),
    ]);

    setSelected(prev => prev ? { ...prev, assigned_to: agentId, agent } : prev);
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, assigned_to: agentId, agent } : c));
    setShowAssignDropdown(false);
    fetchTimeline(selected.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected || sending) return;
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: selected.id, content: newMessage }),
    });
    if (res.ok) {
      setNewMessage("");
      fetchTimeline(selected.id);
      fetchConversations(orgId!);
    }
    setSending(false);
  };

  const filtered = conversations.filter(c => {
    const channels = activeTab === "social" ? SOCIAL_CHANNELS : EMAIL_CHANNELS;
    if (!channels.includes(c.channel)) return false;
    const name = c.contacts?.name ?? c.external_id ?? "";
    if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    if (convFilter === "mine") return c.assigned_to === currentUserId;
    if (convFilter === "unassigned") return c.assigned_to === null;
    if (convFilter === "new") return c.unread_count > 0;
    return true;
  });

  const contactName = (conv: Conversation) => conv.contacts?.name ?? conv.external_id?.split("_").pop() ?? "Desconocido";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando inbox...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>

      {/* Panel izquierdo — lista conversaciones */}
      <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", borderRight: "1px solid #1a1a1a" }}>
        <div style={{ padding: "24px 16px 12px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 16px" }}>Inbox</h1>

          {/* Social / Email */}
          <div style={{ display: "flex", background: "#111", borderRadius: "10px", padding: "3px", gap: "3px", marginBottom: "10px" }}>
            {(["social", "email"] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: activeTab === tab ? "#1e1e1e" : "transparent", color: activeTab === tab ? "#f0f0f0" : "#444", transition: "all 0.15s ease" }}>
                {tab === "social" ? <MessageCircle size={12} /> : <Mail size={12} />}
                {tab === "social" ? "Social" : "Email"}
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
            {CONV_FILTERS.map(f => (
              <button key={f.key} onClick={() => setConvFilter(f.key)}
                style={{ padding: "3px 10px", borderRadius: "20px", border: "1px solid", borderColor: convFilter === f.key ? "#c8f13540" : "#1e1e1e", background: convFilter === f.key ? "#c8f13510" : "transparent", color: convFilter === f.key ? "#c8f135" : "#444", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Buscar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#333" style={{ position: "absolute", left: "10px" }} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none" }} />
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#333", fontSize: "12px", padding: "40px 0" }}>Sin conversaciones</p>
          )}
          {filtered.map(conv => {
            const isSelected = conv.id === selected?.id;
            const isMine = conv.assigned_to === currentUserId;
            const name = contactName(conv);
            return (
              <button key={conv.id} onClick={() => selectConversation(conv)}
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px", borderRadius: "10px", border: isSelected ? "1px solid #c8f13520" : isMine ? "1px solid #c8f13512" : "1px solid transparent", background: isSelected ? "#c8f13508" : isMine ? "#c8f1350a" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: "2px", transition: "all 0.1s ease" }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#141414"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isMine ? "#c8f1350a" : "transparent"; }}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}>
                    {conv.agent ? (
                      <>
                        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 700, color: "#c8f135" }}>
                          {initials(conv.agent.display_name ?? "?")}
                        </div>
                        <span style={{ fontSize: "9px", color: "#555" }}>{conv.agent.display_name}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: "9px", color: "#c8541a", background: "#c8541a15", padding: "1px 6px", borderRadius: "20px", border: "1px solid #c8541a20" }}>Sin asignar</span>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>

          {/* Header */}
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
              <p
                onClick={() => openContactPanel(selected)}
                style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0, cursor: "pointer", display: "inline-block" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#f0f0f0"}
              >
                {contactName(selected)}
              </p>
              <p style={{ fontSize: "10px", color: "#444", margin: "2px 0 0" }}>
                vía {selected.channel.charAt(0).toUpperCase() + selected.channel.slice(1)}
              </p>
            </div>

            {/* Asignar agente */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button onClick={() => setShowAssignDropdown(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer" }}>
                <UserCheck size={12} color={selected.agent ? "#c8f135" : "#555"} />
                <span style={{ fontSize: "11px", color: selected.agent ? "#c8f135" : "#555", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.agent?.display_name ?? "Sin asignar"}
                </span>
                <ChevronDown size={10} color="#444" />
              </button>
              {showAssignDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "4px", minWidth: "170px", zIndex: 50 }}>
                  <button onClick={() => assignConversation(null)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "transparent", border: "none", color: "#c8541a", fontSize: "11px", cursor: "pointer", textAlign: "left" }}>
                    Sin asignar
                  </button>
                  {agents.map(a => (
                    <button key={a.id} onClick={() => assignConversation(a.id)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: selected.agent?.id === a.id ? "#1e1e1e" : "transparent", border: "none", color: "#f0f0f0", fontSize: "11px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700, color: "#c8f135", flexShrink: 0 }}>
                        {initials(a.display_name ?? "?")}
                      </div>
                      {a.display_name ?? a.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button style={{ width: "32px", height: "32px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <MoreVertical size={14} color="#444" />
            </button>
          </div>

          {/* Timeline */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {timeline.map(item => {
              if (item.type === "activity") {
                return (
                  <div key={item.data.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "4px 0" }}>
                    <Activity size={10} color="#444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: "11px", color: "#444", textAlign: "center" }}>
                      {item.data.description}
                      <span style={{ marginLeft: "5px", color: "#333" }}>· {fmtTime(item.data.created_at)}</span>
                    </p>
                  </div>
                );
              }

              const msg = item.data;
              const isMe = msg.from_type === "me";
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {isMe && msg.sender?.display_name && (
                    <span style={{ fontSize: "10px", color: "#555", marginBottom: "3px", paddingRight: "4px" }}>
                      {msg.sender.display_name}
                    </span>
                  )}
                  <div style={{
                    maxWidth: "60%",
                    padding: msg.media_type === "image" ? "6px" : "10px 14px",
                    background: isMe ? "var(--accent)" : "#161616",
                    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    overflow: "hidden",
                  }}>
                    <MessageContent msg={msg} />
                    <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.5, textAlign: "right", color: isMe ? "#0a0a0a" : "#f0f0f0", paddingRight: msg.media_type === "image" ? "6px" : 0 }}>
                      {fmtTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 24px", background: "#0d0d0d", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#111", border: `1px solid ${sending ? "var(--accent)" : "#1e1e1e"}`, borderRadius: "14px", transition: "border-color 0.2s ease" }}>
              <Paperclip size={15} color="#333" style={{ cursor: "pointer" }} />
              <input type="text" placeholder={sending ? "Enviando..." : "Escribí un mensaje..."} value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={sending}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: sending ? "#666" : "#f0f0f0", fontSize: "13px" }} />
              <Smile size={15} color="#333" style={{ cursor: "pointer" }} />
              <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: newMessage.trim() && !sending ? "var(--accent)" : "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: sending ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}>
                {sending
                  ? <div style={{ width: "13px", height: "13px", border: "2px solid #333", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  : <Send size={13} color={newMessage.trim() ? "#0a0a0a" : "#444"} />
                }
              </button>
            </div>
            {sending && (
              <p style={{ fontSize: "10px", color: "var(--accent)", margin: "6px 0 0 4px" }}>Enviando mensaje...</p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "13px", color: "#333" }}>Seleccioná una conversación</p>
        </div>
      )}

      {/* Panel contacto */}
      {contactPanel && (
        <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", borderLeft: "1px solid #1a1a1a" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0" }}>Contacto</span>
            <button onClick={closeContactPanel}
              style={{ width: "26px", height: "26px", borderRadius: "6px", background: "transparent", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#444", transition: "all 0.1s ease", padding: 0 }}
              onMouseEnter={e => { (e.currentTarget).style.background = "#1a1a1a"; (e.currentTarget).style.color = "#f0f0f0"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "#444"; }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Avatar + nombre */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#f0f0f0", marginBottom: "10px" }}>
              {initials(contactPanel.name)}
            </div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", margin: 0, textAlign: "center" }}>{contactPanel.name}</p>
          </div>

          {/* Campos editables */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <ContactField
                label="Nombre"
                value={contactPanel.name}
                onSave={v => saveContactField("name", v)}
              />
              <ContactField
                label="Teléfono"
                value={contactPanel.phone ?? ""}
                onSave={v => saveContactField("phone", v)}
              />
              <ContactField
                label="Email"
                value={contactPanel.email ?? ""}
                onSave={v => saveContactField("email", v)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
