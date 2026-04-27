"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, MoreHorizontal, X, Zap, Pencil, Trash2, Check, RotateCcw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface Pipeline { id: string; name: string; }
interface Stage { id: string; pipeline_id: string; name: string; color: string; position: number; is_fixed: boolean; }
interface CardContact { id: string; name: string; last_name: string | null; avatar_url: string | null; }
interface Card {
  id: string; stage_id: string; contact_id: string | null;
  value: number | null; channel: string | null; assigned_to: string | null;
  created_at: string; contacts: CardContact | null;
  status: string | null; won_amount: number | null;
  lost_reason: string | null; closed_at: string | null;
}
interface Automation {
  id: string; pipeline_id: string; organization_id: string;
  trigger_type: "whatsapp" | "instagram" | "messenger";
  stage_id: string; skip_if_exists: boolean; active: boolean;
}
interface AgentProfile { id: string; display_name: string | null; }
interface Contact { id: string; name: string; last_name: string | null; }
interface ContactDetail {
  id: string; name: string; last_name: string | null;
  phone: string | null; email: string | null; company: string | null;
}
interface CustomFieldDef {
  id: string; name: string;
  field_type: "text" | "select" | "multiselect" | "date" | "daterange";
  options: string[] | null;
}
interface CustomFieldValue { id: string; field_id: string; value: string; }

// ── Constants ──────────────────────────────────────────────────
const COLORS = ["#c8f135", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const CHANNEL_CFG: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  instagram: { label: "Instagram", color: "#E1306C" },
  messenger: { label: "Messenger", color: "#006AFF" },
};

// ── Small components ───────────────────────────────────────────
function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null;
  const cfg = CHANNEL_CFG[channel];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: cfg.color + "20", color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function MiniAvatar({ contact, size = 22 }: { contact: CardContact | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!contact) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#1a1a1a", flexShrink: 0 }} />;
  const name = [contact.name, contact.last_name].filter(Boolean).join(" ");
  const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const src = !failed && (contact.avatar_url || `https://picsum.photos/seed/${contact.id}/200/200`);
  if (!src) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#666", flexShrink: 0 }}>
      {initials}
    </div>
  );
  return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={() => setFailed(true)} />;
}

function KanbanCard({ card, dragging, agents, onReopen, onDelete, onClick }: {
  card: Card; dragging: boolean; agents: AgentProfile[];
  onReopen?: () => void; onDelete?: () => void; onClick?: () => void;
}) {
  const name = card.contacts ? [card.contacts.name, card.contacts.last_name].filter(Boolean).join(" ") : "Sin contacto";
  const agent = agents.find(a => a.id === card.assigned_to);
  const agentInitials = agent?.display_name
    ? agent.display_name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : null;
  const daysAgo = Math.floor((Date.now() - new Date(card.created_at).getTime()) / 86400000);
  const isWon = card.status === "won";
  const isLost = card.status === "lost";
  const isClosed = isWon || isLost;

  return (
    <div style={{
      padding: "11px 12px",
      background: dragging ? "#161616" : "#111",
      border: `1px solid ${isWon ? "#c8f13540" : isLost ? "#ef444440" : "#1e1e1e"}`,
      borderRadius: "10px",
      opacity: isClosed ? 0.7 : (dragging ? 0.4 : 1),
      userSelect: "none", transition: "opacity 0.1s",
      position: "relative", cursor: isClosed ? "default" : "pointer",
    }}
      onClick={onClick}
      onMouseEnter={e => {
        if (!isClosed && !dragging) (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a";
        const btn = (e.currentTarget as HTMLElement).querySelector(".card-delete-btn") as HTMLElement | null;
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={e => {
        if (!isClosed) (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e";
        const btn = (e.currentTarget as HTMLElement).querySelector(".card-delete-btn") as HTMLElement | null;
        if (btn) btn.style.opacity = "0";
      }}
    >
      {onDelete && !isClosed && (
        <button className="card-delete-btn" onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ position: "absolute", top: "6px", right: "6px", width: "18px", height: "18px", borderRadius: "4px", background: "#1a1a1a", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", zIndex: 2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ff444420"; (e.currentTarget as HTMLElement).style.color = "#ff4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; }}
        >
          <X size={10} color="#555" />
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        {isClosed ? (
          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: isWon ? "#c8f13520" : "#ef444420", color: isWon ? "#c8f135" : "#ef4444", border: `1px solid ${isWon ? "#c8f13540" : "#ef444440"}` }}>
            {isWon ? "Ganado" : "Perdido"}
          </span>
        ) : <ChannelBadge channel={card.channel} />}
        {agentInitials && (
          <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#c8f13515", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 700, color: "#c8f135", flexShrink: 0 }}>
            {agentInitials}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
        <MiniAvatar contact={card.contacts} size={22} />
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{name}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {(isWon && card.won_amount != null)
          ? <span style={{ fontSize: "12px", fontWeight: 800, color: "#c8f135" }}>${Number(card.won_amount).toLocaleString()}</span>
          : card.value != null
            ? <span style={{ fontSize: "12px", fontWeight: 800, color: "#c8f135" }}>${Number(card.value).toLocaleString()}</span>
            : <span />}
        {isClosed && onReopen ? (
          <button onClick={e => { e.stopPropagation(); onReopen(); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "2px 7px", color: "#555", fontSize: "9px", fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f0f0f0"; (e.currentTarget as HTMLElement).style.borderColor = "#444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"; }}
          >
            <RotateCcw size={9} /> Reabrir
          </button>
        ) : (
          <span style={{ fontSize: "9px", color: "#333", fontWeight: 500 }}>{daysAgo === 0 ? "Hoy" : `${daysAgo}d`}</span>
        )}
      </div>
      {isLost && card.lost_reason && (
        <p style={{ fontSize: "10px", color: "#555", margin: "7px 0 0", fontStyle: "italic", borderTop: "1px solid #1a1a1a", paddingTop: "6px" }}>"{card.lost_reason}"</p>
      )}
    </div>
  );
}

const miStyle = (red = false): React.CSSProperties => ({
  width: "100%", display: "flex", alignItems: "center", gap: "8px",
  padding: "7px 10px", background: "transparent", border: "none",
  color: red ? "#ff4444" : "#888", fontSize: "12px", fontWeight: 500,
  cursor: "pointer", textAlign: "left", borderRadius: "7px",
});

// ── Main page ──────────────────────────────────────────────────
export default function PipelinePage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // DnD
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Won / Lost modals
  const [pendingDrop, setPendingDrop] = useState<{ cardId: string; stageId: string; isWon: boolean } | null>(null);
  const [wonAmount, setWonAmount] = useState("");
  const [lostReason, setLostReason] = useState("");

  // Stage editing
  const [stageMenuId, setStageMenuId] = useState<string | null>(null);
  const [renamingStageId, setRenamingStageId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  // New pipeline modal
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Add card modal
  const [addCardStageId, setAddCardStageId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [addCardContactId, setAddCardContactId] = useState<string | null>(null);
  const [addCardValue, setAddCardValue] = useState("");
  const [addCardAgent, setAddCardAgent] = useState<string | null>(null);

  // Automations panel
  const [showAutomations, setShowAutomations] = useState(false);
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [autoTrigger, setAutoTrigger] = useState<"whatsapp" | "instagram" | "messenger">("whatsapp");
  const [autoStageId, setAutoStageId] = useState<string>("");
  const [autoSkip, setAutoSkip] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);

  // Card detail panel
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [panelContact, setPanelContact] = useState<ContactDetail | null>(null);
  const [panelFields, setPanelFields] = useState<{ defs: CustomFieldDef[]; values: CustomFieldValue[] }>({ defs: [], values: [] });
  const [loadingPanel, setLoadingPanel] = useState(false);

  // Add card error
  const [addCardError, setAddCardError] = useState<string | null>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => {
    if (activePipelineId) { setShowAutoForm(false); loadPipeline(activePipelineId); }
  }, [activePipelineId]);

  const init = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile) return;
      const oid = profile.organization_id;
      setOrgId(oid);
      const [{ data: ps }, { data: ags }] = await Promise.all([
        supabase.from("pipelines").select("id, name").eq("organization_id", oid).order("created_at"),
        supabase.from("profiles").select("id, display_name").eq("organization_id", oid),
      ]);
      setPipelines((ps as Pipeline[]) ?? []);
      setAgents((ags as AgentProfile[]) ?? []);
      if (ps && ps.length > 0) setActivePipelineId(ps[0].id);
    } finally {
      setLoading(false);
    }
  };

  const loadPipeline = async (pipelineId: string) => {
    const supabase = createClient();
    const [{ data: stgs }, { data: cds }, { data: autos }] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("pipeline_id", pipelineId).order("position"),
      supabase.from("pipeline_cards").select("*, contacts(id, name, last_name, avatar_url)").eq("pipeline_id", pipelineId),
      supabase.from("pipeline_automations").select("*").eq("pipeline_id", pipelineId),
    ]);
    const stagesData = (stgs as Stage[]) ?? [];
    setStages(stagesData);
    setCards((cds as Card[]) ?? []);
    setAutomations((autos as Automation[]) ?? []);
    const firstFree = stagesData.find(s => !s.is_fixed);
    if (firstFree) setAutoStageId(firstFree.id);
  };

  const createPipeline = async () => {
    if (!newPipelineName.trim() || !orgId) return;
    setCreatingPipeline(true);
    setPipelineError(null);
    const supabase = createClient();
    const { data: pipeline, error } = await supabase.from("pipelines")
      .insert({ organization_id: orgId, name: newPipelineName.trim() }).select().single();
    if (error) {
      console.error("Pipeline create error:", error);
      setPipelineError("Error al crear. ¿Corriste el SQL en Supabase?");
      setCreatingPipeline(false);
      return;
    }
    if (pipeline) {
      await supabase.from("pipeline_stages").insert([
        { pipeline_id: pipeline.id, name: "Nuevo", color: "#3b82f6", position: 0, is_fixed: false },
        { pipeline_id: pipeline.id, name: "En proceso", color: "#f59e0b", position: 1, is_fixed: false },
        { pipeline_id: pipeline.id, name: "Cerrado", color: "#8b5cf6", position: 2, is_fixed: false },
        { pipeline_id: pipeline.id, name: "Ganado", color: "#c8f135", position: 98, is_fixed: true },
        { pipeline_id: pipeline.id, name: "Perdido", color: "#ef4444", position: 99, is_fixed: true },
      ]);
      setPipelines(prev => [...prev, pipeline as Pipeline]);
      setActivePipelineId(pipeline.id);
      setShowNewPipeline(false);
      setNewPipelineName("");
    }
    setCreatingPipeline(false);
  };

  const addStage = async () => {
    if (!activePipelineId) return;
    const maxFreePos = Math.max(...stages.filter(s => !s.is_fixed).map(s => s.position), -1);
    const supabase = createClient();
    const { data } = await supabase.from("pipeline_stages")
      .insert({ pipeline_id: activePipelineId, name: "Nueva etapa", color: "#c8f135", position: maxFreePos + 1, is_fixed: false })
      .select().single();
    if (data) {
      setStages(prev => {
        const updated = [...prev, data as Stage];
        return updated.sort((a, b) => a.position - b.position);
      });
      setRenamingStageId((data as Stage).id);
      setRenameVal("Nueva etapa");
    }
  };

  const renameStage = async (stageId: string, name: string) => {
    const supabase = createClient();
    await supabase.from("pipeline_stages").update({ name }).eq("id", stageId);
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, name } : s));
    setRenamingStageId(null);
  };

  const changeStageColor = async (stageId: string, color: string) => {
    const supabase = createClient();
    await supabase.from("pipeline_stages").update({ color }).eq("id", stageId);
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, color } : s));
  };

  const deleteStage = async (stageId: string) => {
    const supabase = createClient();
    await supabase.from("pipeline_stages").delete().eq("id", stageId);
    setStages(prev => prev.filter(s => s.id !== stageId));
    setCards(prev => prev.filter(c => c.stage_id !== stageId));
  };

  const handleDrop = async (targetStageId: string) => {
    if (!draggingCardId) { setDragOverStageId(null); return; }
    const card = cards.find(c => c.id === draggingCardId);
    if (!card || card.stage_id === targetStageId || card.status != null) {
      setDraggingCardId(null); setDragOverStageId(null); return;
    }
    const targetStage = stages.find(s => s.id === targetStageId);
    setDraggingCardId(null);
    setDragOverStageId(null);

    if (targetStage?.is_fixed) {
      setPendingDrop({ cardId: card.id, stageId: targetStageId, isWon: targetStage.name === "Ganado" });
      setWonAmount(""); setLostReason("");
      return;
    }
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, stage_id: targetStageId } : c));
    const supabase = createClient();
    await supabase.from("pipeline_cards").update({ stage_id: targetStageId }).eq("id", card.id);
  };

  const confirmDrop = async () => {
    if (!pendingDrop) return;
    const { cardId, stageId, isWon } = pendingDrop;
    if (isWon && !wonAmount.trim()) return;
    const supabase = createClient();
    const updates = isWon
      ? { stage_id: stageId, status: "won", won_amount: Number(wonAmount), closed_at: new Date().toISOString() }
      : { stage_id: stageId, status: "lost", lost_reason: lostReason.trim() || null, closed_at: new Date().toISOString() };
    await supabase.from("pipeline_cards").update(updates).eq("id", cardId);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
    setPendingDrop(null);
  };

  const reopenCard = async (cardId: string) => {
    const firstFreeStage = stages.find(s => !s.is_fixed);
    if (!firstFreeStage) return;
    const supabase = createClient();
    await supabase.from("pipeline_cards").update({
      stage_id: firstFreeStage.id, status: null, won_amount: null, lost_reason: null, closed_at: null,
    }).eq("id", cardId);
    setCards(prev => prev.map(c => c.id === cardId
      ? { ...c, stage_id: firstFreeStage.id, status: null, won_amount: null, lost_reason: null, closed_at: null }
      : c));
  };

  const openAddCard = async (stageId: string) => {
    setAddCardStageId(stageId);
    setAddCardContactId(null); setAddCardValue(""); setAddCardAgent(null); setContactSearch(""); setAddCardError(null);
    if (contacts.length === 0) {
      const supabase = createClient();
      const { data } = await supabase.from("contacts").select("id, name, last_name").order("name");
      setContacts((data as Contact[]) ?? []);
    }
  };

  const createCard = async () => {
    if (!addCardStageId || !activePipelineId) return;
    setAddCardError(null);
    const supabase = createClient();

    if (addCardContactId) {
      const { data: existing } = await supabase
        .from("pipeline_cards").select("id")
        .eq("pipeline_id", activePipelineId).eq("contact_id", addCardContactId).maybeSingle();
      if (existing) {
        setAddCardError("Este contacto ya está en el pipeline");
        return;
      }
    }

    const { data } = await supabase.from("pipeline_cards").insert({
      pipeline_id: activePipelineId, stage_id: addCardStageId,
      contact_id: addCardContactId,
      value: addCardValue ? Number(addCardValue) : null,
      assigned_to: addCardAgent,
    }).select("*, contacts(id, name, last_name, avatar_url)").single();
    if (data) setCards(prev => [...prev, data as Card]);
    setAddCardStageId(null);
  };

  const deleteCard = async (cardId: string) => {
    const supabase = createClient();
    await supabase.from("pipeline_cards").delete().eq("id", cardId);
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (selectedCard?.id === cardId) setSelectedCard(null);
  };

  const openCardPanel = async (card: Card) => {
    setSelectedCard(card);
    setShowAutomations(false);
    if (!card.contact_id) {
      setPanelContact(null);
      setPanelFields({ defs: [], values: [] });
      return;
    }
    setLoadingPanel(true);
    const supabase = createClient();
    const [{ data: contact }, { data: defs }, { data: values }] = await Promise.all([
      supabase.from("contacts").select("id, name, last_name, phone, email, company").eq("id", card.contact_id).single(),
      supabase.from("custom_field_definitions").select("*").eq("organization_id", orgId),
      supabase.from("custom_field_values").select("*").eq("contact_id", card.contact_id),
    ]);
    setPanelContact((contact as ContactDetail) ?? null);
    setPanelFields({ defs: (defs as CustomFieldDef[]) ?? [], values: (values as CustomFieldValue[]) ?? [] });
    setLoadingPanel(false);
  };

  const createAutomation = async () => {
    if (!activePipelineId || !orgId || !autoStageId) return;
    setSavingAuto(true);
    const supabase = createClient();
    const { data } = await supabase.from("pipeline_automations").insert({
      pipeline_id: activePipelineId, organization_id: orgId,
      trigger_type: autoTrigger, stage_id: autoStageId,
      skip_if_exists: autoSkip, active: true,
    }).select().single();
    if (data) setAutomations(prev => [...prev, data as Automation]);
    setShowAutoForm(false);
    setSavingAuto(false);
  };

  const toggleAutomation = async (autoId: string, active: boolean) => {
    const supabase = createClient();
    await supabase.from("pipeline_automations").update({ active }).eq("id", autoId);
    setAutomations(prev => prev.map(a => a.id === autoId ? { ...a, active } : a));
  };

  const deleteAutomation = async (autoId: string) => {
    const supabase = createClient();
    await supabase.from("pipeline_automations").delete().eq("id", autoId);
    setAutomations(prev => prev.filter(a => a.id !== autoId));
  };

  const activePipeline = pipelines.find(p => p.id === activePipelineId);
  const activeCards = cards.filter(c => c.status == null);
  const totalValue = activeCards.reduce((s, c) => s + (c.value ?? 0), 0);
  const freeStages = stages.filter(s => !s.is_fixed);
  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase();
    return (c.name ?? "").toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q);
  });
  const activeAutoCount = automations.filter(a => a.active).length;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0a0a0a", position: "relative" }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0, overflowX: "auto" }}>
            {pipelines.map(p => (
              <button key={p.id} onClick={() => setActivePipelineId(p.id)}
                style={{ padding: "5px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: activePipelineId === p.id ? "#1a1a1a" : "transparent", color: activePipelineId === p.id ? "#f0f0f0" : "#444", borderBottom: activePipelineId === p.id ? "2px solid var(--accent)" : "2px solid transparent", transition: "all 0.1s" }}>
                {p.name}
              </button>
            ))}
            <button onClick={() => setShowNewPipeline(true)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", background: "transparent", border: "1px dashed #2a2a2a", color: "#444", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c8f13540"; (e.currentTarget as HTMLElement).style.color = "#c8f135"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLElement).style.color = "#444"; }}
            >
              <Plus size={11} /> Nuevo Pipeline
            </button>
          </div>
          {activePipelineId && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <p style={{ fontSize: "10px", color: "#444", margin: 0, whiteSpace: "nowrap" }}>
                {activeCards.length} activos{totalValue > 0 ? ` · $${totalValue.toLocaleString()}` : ""}
              </p>
              <button onClick={() => { setShowAutomations(true); setSelectedCard(null); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "#c8f13510", border: "1px solid #c8f13530", color: "#c8f135", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#c8f13520"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#c8f13510"}
              >
                <Zap size={12} />
                Automatizaciones
                {activeAutoCount > 0 && <span style={{ background: "#c8f135", color: "#0a0a0a", borderRadius: "20px", padding: "0 5px", fontSize: "9px", fontWeight: 800 }}>{activeAutoCount}</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Kanban ────────────────────────────────────────────── */}
      {pipelines.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
          <p style={{ fontSize: "13px", color: "#444" }}>No hay pipelines todavía</p>
          <button onClick={() => setShowNewPipeline(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", background: "var(--accent)", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            <Plus size={14} /> Crear Pipeline
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
          <div style={{ display: "flex", gap: "12px", padding: "20px 24px", height: "100%", minWidth: "max-content", alignItems: "flex-start", boxSizing: "border-box" }}>
            {stages.map(stage => {
              const stageCards = cards.filter(c => c.stage_id === stage.id);
              const isDragOver = dragOverStageId === stage.id;
              const menuOpen = stageMenuId === stage.id;
              const isRenaming = renamingStageId === stage.id;
              const colorPickerOpen = colorPickerId === stage.id;
              const stageValue = stageCards.reduce((s, c) => s + (c.won_amount ?? c.value ?? 0), 0);

              return (
                <div key={stage.id}
                  style={{
                    display: "flex", flexDirection: "column", width: "260px", flexShrink: 0,
                    background: isDragOver ? (stage.name === "Ganado" ? "#c8f13506" : stage.name === "Perdido" ? "#ef444406" : "#c8f13506") : "#0d0d0d",
                    border: `1px solid ${isDragOver ? (stage.name === "Perdido" ? "#ef444440" : "#c8f13540") : (stage.is_fixed ? "#1e1e1e" : "#1a1a1a")}`,
                    borderRadius: "14px", transition: "all 0.15s",
                    maxHeight: "calc(100vh - 120px)",
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverStageId(stage.id); }}
                  onDrop={() => handleDrop(stage.id)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStageId(null); }}
                >
                  {/* Stage header */}
                  <div style={{ padding: "13px 12px 9px", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      {/* Color dot / picker (only for non-fixed) */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div onClick={() => !stage.is_fixed && setColorPickerId(colorPickerOpen ? null : stage.id)}
                          style={{ width: "8px", height: "8px", borderRadius: "50%", background: stage.color, cursor: stage.is_fixed ? "default" : "pointer" }}
                        />
                        {colorPickerOpen && !stage.is_fixed && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setColorPickerId(null)} />
                            <div style={{ position: "absolute", top: "14px", left: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "10px", zIndex: 50 }}>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", width: "116px" }}>
                                {COLORS.map(c => (
                                  <button key={c} onClick={() => { changeStageColor(stage.id, c); setColorPickerId(null); }}
                                    style={{ width: "22px", height: "22px", borderRadius: "6px", background: c, border: `2px solid ${stage.color === c ? "#fff" : "transparent"}`, cursor: "pointer", padding: 0 }} />
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Stage name */}
                      {isRenaming ? (
                        <input autoFocus value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={() => { if (renameVal.trim()) renameStage(stage.id, renameVal.trim()); else setRenamingStageId(null); }}
                          onKeyDown={e => { if (e.key === "Enter" && renameVal.trim()) renameStage(stage.id, renameVal.trim()); if (e.key === "Escape") setRenamingStageId(null); }}
                          style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--accent)", color: "#f0f0f0", fontSize: "11px", fontWeight: 700, outline: "none", padding: "0 0 1px", minWidth: 0 }}
                        />
                      ) : (
                        <span style={{ flex: 1, fontSize: "11px", fontWeight: 700, color: "#f0f0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage.name}</span>
                      )}

                      <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "6px", background: "#161616", color: "#444", flexShrink: 0 }}>{stageCards.length}</span>

                      {/* + card (only non-fixed) */}
                      {!stage.is_fixed && (
                        <button onClick={() => openAddCard(stage.id)}
                          style={{ width: "22px", height: "22px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#1a1a1a"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                        >
                          <Plus size={13} color="#444" />
                        </button>
                      )}

                      {/* Stage menu */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <button onClick={() => setStageMenuId(menuOpen ? null : stage.id)}
                          style={{ width: "22px", height: "22px", borderRadius: "6px", background: menuOpen ? "#1a1a1a" : "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#1a1a1a"}
                          onMouseLeave={e => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <MoreHorizontal size={13} color="#444" />
                        </button>
                        {menuOpen && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setStageMenuId(null)} />
                            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#161616", border: "1px solid #222", borderRadius: "10px", padding: "4px", zIndex: 50, minWidth: "150px" }}>
                              <button onClick={() => { setRenamingStageId(stage.id); setRenameVal(stage.name); setStageMenuId(null); }}
                                style={miStyle()}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#f0f0f0"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888"; }}>
                                <Pencil size={12} /> Renombrar
                              </button>
                              {!stage.is_fixed && (
                                <>
                                  <div style={{ height: "1px", background: "#1e1e1e", margin: "4px 0" }} />
                                  <button onClick={() => { deleteStage(stage.id); setStageMenuId(null); }}
                                    style={miStyle(true)}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#ff444415"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                    <Trash2 size={12} /> Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {stageValue > 0 && (
                      <p style={{ fontSize: "10px", color: "#444", margin: "5px 0 0 15px", fontWeight: 600 }}>${stageValue.toLocaleString()}</p>
                    )}
                  </div>

                  <div style={{ height: "1px", background: "#161616", margin: "0 12px" }} />

                  {/* Cards */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stageCards.map(card => {
                      const isClosed = card.status != null;
                      return (
                        <div key={card.id}
                          draggable={!isClosed}
                          onDragStart={() => !isClosed && setDraggingCardId(card.id)}
                          onDragEnd={() => { setDraggingCardId(null); setDragOverStageId(null); }}
                          style={{ cursor: isClosed ? "default" : "grab" }}
                        >
                          <KanbanCard
                            card={card}
                            dragging={draggingCardId === card.id}
                            agents={agents}
                            onReopen={isClosed ? () => reopenCard(card.id) : undefined}
                            onDelete={!isClosed ? () => deleteCard(card.id) : undefined}
                            onClick={() => openCardPanel(card)}
                          />
                        </div>
                      );
                    })}
                    {stageCards.length === 0 && !isDragOver && (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80px", border: "1px dashed #1e1e1e", borderRadius: "10px" }}>
                        <p style={{ fontSize: "10px", color: "#2a2a2a" }}>Arrastrá aquí</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* + Etapa (only before fixed stages) */}
            {activePipelineId && (
              <button onClick={addStage}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", height: "fit-content", background: "transparent", border: "1px dashed #1e1e1e", borderRadius: "14px", color: "#333", fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: "0px" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c8f13540"; (e.currentTarget as HTMLElement).style.color = "#c8f135"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#333"; }}
              >
                <Plus size={13} /> Etapa
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Won modal ─────────────────────────────────────────── */}
      {pendingDrop?.isWon && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#161616", border: "1px solid #c8f13540", borderRadius: "16px", padding: "28px", width: "360px", zIndex: 101 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#c8f135", margin: 0 }}>Deal Ganado 🎉</h2>
                <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>Ingresá el monto del deal para confirmar</p>
              </div>
              <button onClick={() => setPendingDrop(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Monto del deal *</p>
              <input autoFocus type="number" placeholder="0"
                value={wonAmount} onChange={e => setWonAmount(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmDrop(); }}
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #c8f13540", borderRadius: "10px", padding: "10px 14px", color: "#c8f135", fontSize: "16px", fontWeight: 700, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPendingDrop(null)}
                style={{ flex: 1, padding: "9px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#666", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDrop} disabled={!wonAmount.trim()}
                style={{ flex: 1, padding: "9px", borderRadius: "8px", background: wonAmount.trim() ? "#c8f135" : "#1a1a1a", border: "none", color: wonAmount.trim() ? "#0a0a0a" : "#333", fontSize: "12px", fontWeight: 700, cursor: wonAmount.trim() ? "pointer" : "default" }}>
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Lost modal ────────────────────────────────────────── */}
      {pendingDrop && !pendingDrop.isWon && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#161616", border: "1px solid #ef444440", borderRadius: "16px", padding: "28px", width: "360px", zIndex: 101 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444", margin: 0 }}>Deal Perdido</h2>
                <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>Podés agregar un motivo (opcional)</p>
              </div>
              <button onClick={() => setPendingDrop(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Motivo de pérdida</p>
              <textarea placeholder="Ej: Presupuesto insuficiente, eligió competidor..."
                value={lostReason} onChange={e => setLostReason(e.target.value)}
                rows={3}
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "10px 14px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPendingDrop(null)}
                style={{ flex: 1, padding: "9px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#666", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDrop}
                style={{ flex: 1, padding: "9px", borderRadius: "8px", background: "#ef4444", border: "none", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── New Pipeline Modal ─────────────────────────────────── */}
      {showNewPipeline && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100 }} onClick={() => { setShowNewPipeline(false); setPipelineError(null); }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#161616", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "28px", width: "380px", zIndex: 101 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Nuevo Pipeline</h2>
              <button onClick={() => setShowNewPipeline(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>
            <input autoFocus placeholder="Nombre del pipeline..."
              value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createPipeline(); }}
              style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "10px 14px", color: "#f0f0f0", fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }}
            />
            {pipelineError && (
              <p style={{ fontSize: "11px", color: "#ff4444", margin: "0 0 12px", background: "#ff444410", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ff444430" }}>{pipelineError}</p>
            )}
            <p style={{ fontSize: "11px", color: "#444", margin: "0 0 20px" }}>
              Etapas por defecto: <span style={{ color: "#666" }}>Nuevo, En proceso, Cerrado, Ganado, Perdido</span>
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewPipeline(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#666", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={createPipeline} disabled={!newPipelineName.trim() || creatingPipeline}
                style={{ padding: "8px 16px", borderRadius: "8px", background: newPipelineName.trim() ? "var(--accent)" : "#1a1a1a", border: "none", color: newPipelineName.trim() ? "#0a0a0a" : "#333", fontSize: "12px", fontWeight: 700, cursor: newPipelineName.trim() ? "pointer" : "default" }}>
                {creatingPipeline ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Add Card Modal ─────────────────────────────────────── */}
      {addCardStageId !== null && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100 }} onClick={() => setAddCardStageId(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#161616", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "28px", width: "400px", zIndex: 101, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Agregar card</h2>
              <button onClick={() => setAddCardStageId(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Contacto</p>
              <input placeholder="Buscar..." value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "7px 12px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box", marginBottom: "6px" }}
              />
              <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d" }}>
                <button onClick={() => setAddCardContactId(null)}
                  style={{ width: "100%", padding: "8px 12px", background: addCardContactId === null ? "#1e1e1e" : "transparent", border: "none", color: addCardContactId === null ? "#f0f0f0" : "#444", fontSize: "12px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  {addCardContactId === null && <Check size={11} color="#c8f135" />} Sin contacto
                </button>
                {filteredContacts.slice(0, 40).map(c => {
                  const cname = [c.name, c.last_name].filter(Boolean).join(" ");
                  return (
                    <button key={c.id} onClick={() => setAddCardContactId(c.id)}
                      style={{ width: "100%", padding: "8px 12px", background: addCardContactId === c.id ? "#1e1e1e" : "transparent", border: "none", color: addCardContactId === c.id ? "#f0f0f0" : "#888", fontSize: "12px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      {addCardContactId === c.id && <Check size={11} color="#c8f135" />}
                      {cname || "Sin nombre"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Valor (opcional)</p>
              <input type="number" placeholder="0" value={addCardValue} onChange={e => setAddCardValue(e.target.value)}
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: "#f0f0f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Agente (opcional)</p>
              <div style={{ border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d", overflow: "hidden" }}>
                <button onClick={() => setAddCardAgent(null)}
                  style={{ width: "100%", padding: "8px 12px", background: addCardAgent === null ? "#1e1e1e" : "transparent", border: "none", color: addCardAgent === null ? "#f0f0f0" : "#444", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>
                  Sin asignar
                </button>
                {agents.map(a => (
                  <button key={a.id} onClick={() => setAddCardAgent(a.id)}
                    style={{ width: "100%", padding: "8px 12px", background: addCardAgent === a.id ? "#1e1e1e" : "transparent", border: "none", color: addCardAgent === a.id ? "#f0f0f0" : "#888", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>
                    {a.display_name ?? a.id.slice(0, 8)}
                  </button>
                ))}
              </div>
            </div>
            {addCardError && (
              <p style={{ fontSize: "11px", color: "#ff4444", margin: "0 0 12px", background: "#ff444410", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ff444430" }}>{addCardError}</p>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setAddCardStageId(null)}
                style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#666", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={createCard}
                style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--accent)", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                Agregar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Card Detail Panel ─────────────────────────────────── */}
      {selectedCard && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setSelectedCard(null)} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "340px", background: "#111", borderLeft: "1px solid #1e1e1e", zIndex: 99, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px #00000060" }}>
            <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MiniAvatar contact={selectedCard.contacts} size={34} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>
                    {selectedCard.contacts ? [selectedCard.contacts.name, selectedCard.contacts.last_name].filter(Boolean).join(" ") : "Sin contacto"}
                  </p>
                  <p style={{ fontSize: "10px", color: "#444", margin: "2px 0 0" }}>
                    {stages.find(s => s.id === selectedCard.stage_id)?.name ?? ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCard(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {/* Pipeline card info */}
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Deal</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Valor</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#c8f135" }}>
                    {selectedCard.value != null ? `$${Number(selectedCard.value).toLocaleString()}` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Agente</span>
                  <span style={{ fontSize: "12px", color: "#f0f0f0" }}>
                    {agents.find(a => a.id === selectedCard.assigned_to)?.display_name ?? "Sin asignar"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Creado</span>
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    {new Date(selectedCard.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Contact info */}
              {loadingPanel ? (
                <p style={{ fontSize: "11px", color: "#444", textAlign: "center", padding: "16px 0" }}>Cargando...</p>
              ) : panelContact ? (
                <>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Contacto</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    {[
                      { label: "Teléfono", val: panelContact.phone },
                      { label: "Email", val: panelContact.email },
                      { label: "Empresa", val: panelContact.company },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                        <span style={{ fontSize: "11px", color: "#555" }}>{label}</span>
                        <span style={{ fontSize: "12px", color: val ? "#f0f0f0" : "#333" }}>{val || "—"}</span>
                      </div>
                    ))}
                  </div>

                  {panelFields.defs.length > 0 && (
                    <>
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Campos personalizados</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {panelFields.defs.map(def => {
                          const val = panelFields.values.find(v => v.field_id === def.id)?.value ?? "";
                          return (
                            <div key={def.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 12px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a", gap: "10px" }}>
                              <span style={{ fontSize: "11px", color: "#555", flexShrink: 0 }}>{def.name}</span>
                              <span style={{ fontSize: "12px", color: val ? "#f0f0f0" : "#333", textAlign: "right", wordBreak: "break-word" }}>{val || "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : selectedCard.contact_id ? null : (
                <p style={{ fontSize: "11px", color: "#333", textAlign: "center", padding: "12px 0" }}>Sin contacto asignado</p>
              )}
            </div>

            {panelContact && (
              <div style={{ padding: "14px 16px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
                <a href={`/contactos/${panelContact.id}`}
                  style={{ display: "block", width: "100%", padding: "9px", borderRadius: "10px", background: "#c8f13510", border: "1px solid #c8f13530", color: "#c8f135", fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "center", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#c8f13520"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#c8f13510"}
                >
                  Ver contacto completo →
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Automations Panel ──────────────────────────────────── */}
      {showAutomations && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => { setShowAutomations(false); setShowAutoForm(false); }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "360px", background: "#111", borderLeft: "1px solid #1e1e1e", zIndex: 99, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px #00000060" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Automatizaciones</h3>
                <p style={{ fontSize: "10px", color: "#444", margin: "3px 0 0" }}>{activePipeline?.name}</p>
              </div>
              <button onClick={() => { setShowAutomations(false); setShowAutoForm(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {automations.length === 0 && !showAutoForm && (
                <p style={{ fontSize: "12px", color: "#333", textAlign: "center", padding: "24px 0" }}>No hay automatizaciones</p>
              )}
              {automations.map(auto => {
                const targetStage = stages.find(s => s.id === auto.stage_id);
                const cfg = CHANNEL_CFG[auto.trigger_type];
                return (
                  <div key={auto.id} style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "14px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={() => toggleAutomation(auto.id, !auto.active)}
                          style={{ width: "32px", height: "17px", borderRadius: "20px", border: "none", cursor: "pointer", padding: 0, position: "relative", background: auto.active ? "var(--accent)" : "#222", transition: "background 0.2s", flexShrink: 0 }}>
                          <div style={{ position: "absolute", top: "2px", left: auto.active ? "17px" : "2px", width: "13px", height: "13px", borderRadius: "50%", background: auto.active ? "#0a0a0a" : "#444", transition: "left 0.2s" }} />
                        </button>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: auto.active ? "#f0f0f0" : "#444" }}>{auto.active ? "Activa" : "Inactiva"}</span>
                      </div>
                      <button onClick={() => deleteAutomation(auto.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#333" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ff4444"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#333"}>
                        <X size={13} />
                      </button>
                    </div>
                    <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px", lineHeight: 1.5 }}>
                      <span style={{ color: cfg?.color ?? "#888", fontWeight: 600 }}>{cfg?.label}</span>
                      {" "}<span style={{ color: "#333" }}>→</span>{" "}
                      <span style={{ color: "#f0f0f0" }}>Card en "{targetStage?.name ?? "?"}"</span>
                    </p>
                    {auto.skip_if_exists && <p style={{ fontSize: "10px", color: "#333", margin: 0 }}>Solo si no existe card en este pipeline</p>}
                  </div>
                );
              })}
              {showAutoForm && (
                <div style={{ background: "#161616", border: "1px solid #c8f13530", borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Nueva automatización</p>
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Disparador</p>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["whatsapp", "instagram", "messenger"] as const).map(ch => (
                        <button key={ch} onClick={() => setAutoTrigger(ch)}
                          style={{ flex: 1, padding: "6px 4px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: 700, background: autoTrigger === ch ? (CHANNEL_CFG[ch].color + "20") : "#111", color: autoTrigger === ch ? CHANNEL_CFG[ch].color : "#444", outline: autoTrigger === ch ? `1px solid ${CHANNEL_CFG[ch].color}40` : "none" }}>
                          {CHANNEL_CFG[ch].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Crear card en etapa</p>
                    <select value={autoStageId} onChange={e => setAutoStageId(e.target.value)}
                      style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: "#f0f0f0", fontSize: "12px", outline: "none" }}>
                      {freeStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input type="checkbox" checked={autoSkip} onChange={e => setAutoSkip(e.target.checked)} style={{ accentColor: "var(--accent)", width: "13px", height: "13px" }} />
                      <span style={{ fontSize: "11px", color: "#888" }}>Solo si el contacto no tiene card en este pipeline</span>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setShowAutoForm(false)}
                      style={{ flex: 1, padding: "7px", borderRadius: "8px", background: "transparent", border: "1px solid #2a2a2a", color: "#555", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                      Cancelar
                    </button>
                    <button onClick={createAutomation} disabled={!autoStageId || savingAuto}
                      style={{ flex: 1, padding: "7px", borderRadius: "8px", background: "var(--accent)", border: "none", color: "#0a0a0a", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                      {savingAuto ? "..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!showAutoForm && (
              <div style={{ padding: "16px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
                <button onClick={() => setShowAutoForm(true)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "10px", background: "#c8f13510", border: "1px solid #c8f13530", color: "#c8f135", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#c8f13520"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#c8f13510"}
                >
                  <Plus size={13} /> Nueva automatización
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
