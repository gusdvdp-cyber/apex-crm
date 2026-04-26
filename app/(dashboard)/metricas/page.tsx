"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";

interface ConvRow { id: string; channel: string; created_at: string; assigned_to: string | null; }
interface MsgRow { conversation_id: string; created_at: string; from_type: string; }
interface CardRow { id: string; stage_id: string; assigned_to: string | null; won_amount: number | null; status: string | null; closed_at: string | null; }
interface StageRow { id: string; pipeline_id: string; name: string; color: string; position: number; is_fixed: boolean; }
interface PipelineRow { id: string; name: string; }
interface AgentRow { id: string; display_name: string | null; }

type PeriodKey = "hoy" | "semana" | "mes" | "custom";

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "#25D366", instagram: "#E1306C", messenger: "#0099FF", gmail: "#EA4335", outlook: "#0072C6",
};

function getRange(period: PeriodKey, from: string, to: string): [Date, Date] {
  const now = new Date();
  if (period === "hoy") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return [s, now];
  }
  if (period === "semana") {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
    return [s, now];
  }
  if (period === "mes") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return [s, now];
  }
  const s = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const e = to ? new Date(to + "T23:59:59") : now;
  return [s, e];
}

function inRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function fmtMins(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Sel({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: "none", background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "11px", padding: "6px 28px 6px 10px", cursor: "pointer", outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={10} color="#444" style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

export default function MetricasPage() {
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selPipeline, setSelPipeline] = useState("all");
  const [selAgent, setSelAgent] = useState("all");

  const [pipelines, setPipelines] = useState<PipelineRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile) return;
      const oid = profile.organization_id;

      const [{ data: pipes }, { data: agts }, { data: convData }] = await Promise.all([
        supabase.from("pipelines").select("id, name").eq("organization_id", oid),
        supabase.from("profiles").select("id, display_name").eq("organization_id", oid),
        supabase.from("conversations").select("id, channel, created_at, assigned_to").eq("organization_id", oid),
      ]);

      setPipelines(pipes ?? []);
      setAgents((agts as AgentRow[]) ?? []);
      setConvs((convData as ConvRow[]) ?? []);

      // Load pipeline stages + cards
      const pipeIds = (pipes ?? []).map(p => p.id);
      let stageRows: StageRow[] = [];
      let cardRows: CardRow[] = [];
      if (pipeIds.length > 0) {
        const { data: sd } = await supabase.from("pipeline_stages")
          .select("id, pipeline_id, name, color, position, is_fixed")
          .in("pipeline_id", pipeIds);
        stageRows = (sd as StageRow[]) ?? [];
        setStages(stageRows);

        const stageIds = stageRows.map(s => s.id);
        if (stageIds.length > 0) {
          const { data: cd } = await supabase.from("pipeline_cards")
            .select("id, stage_id, assigned_to, won_amount, status, closed_at")
            .in("stage_id", stageIds);
          cardRows = (cd as CardRow[]) ?? [];
          setCards(cardRows);
        }
      }

      // Load messages for response time (chunked)
      if (convData && convData.length > 0) {
        const ids = (convData as ConvRow[]).map(c => c.id);
        const allMsgs: MsgRow[] = [];
        for (let i = 0; i < ids.length; i += 80) {
          const chunk = ids.slice(i, i + 80);
          const { data: md } = await supabase.from("messages")
            .select("conversation_id, created_at, from_type")
            .in("conversation_id", chunk)
            .order("created_at", { ascending: true });
          if (md) allMsgs.push(...(md as MsgRow[]));
        }
        setMsgs(allMsgs);
      }

      setLoading(false);
    };
    init();
  }, []);

  // --- derived state ---
  const [start, end] = useMemo(() => getRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const stageById = useMemo(() => Object.fromEntries(stages.map(s => [s.id, s])), [stages]);

  const filteredConvs = useMemo(() =>
    convs.filter(c =>
      inRange(c.created_at, start, end) &&
      (selAgent === "all" || c.assigned_to === selAgent)
    ), [convs, start, end, selAgent]);

  const filteredCards = useMemo(() =>
    cards.filter(c => {
      const stg = stageById[c.stage_id];
      if (!stg) return false;
      if (selPipeline !== "all" && stg.pipeline_id !== selPipeline) return false;
      if (selAgent !== "all" && c.assigned_to !== selAgent) return false;
      return true;
    }), [cards, selPipeline, selAgent, stageById]);

  const wonCards = useMemo(() =>
    filteredCards.filter(c => c.status === "won" && inRange(c.closed_at, start, end)),
    [filteredCards, start, end]);

  const lostCards = useMemo(() =>
    filteredCards.filter(c => c.status === "lost" && inRange(c.closed_at, start, end)),
    [filteredCards, start, end]);

  const revenue = useMemo(() => wonCards.reduce((s, c) => s + (c.won_amount ?? 0), 0), [wonCards]);
  const closeRate = useMemo(() => {
    const tot = wonCards.length + lostCards.length;
    return tot > 0 ? (wonCards.length / tot) * 100 : 0;
  }, [wonCards, lostCards]);
  const avgWonValue = wonCards.length > 0 ? revenue / wonCards.length : 0;

  const channelCounts = useMemo(() => {
    const m: Record<string, number> = {};
    filteredConvs.forEach(c => { m[c.channel] = (m[c.channel] ?? 0) + 1; });
    return m;
  }, [filteredConvs]);

  const avgResponseMins = useMemo(() => {
    const convMsgs: Record<string, MsgRow[]> = {};
    const convIds = new Set(filteredConvs.map(c => c.id));
    msgs.forEach(m => {
      if (!convIds.has(m.conversation_id)) return;
      if (!convMsgs[m.conversation_id]) convMsgs[m.conversation_id] = [];
      convMsgs[m.conversation_id].push(m);
    });
    const times: number[] = [];
    Object.values(convMsgs).forEach(ms => {
      const sorted = [...ms].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const fc = sorted.find(m => m.from_type === "contact");
      if (!fc) return;
      const fm = sorted.find(m => m.from_type === "me" && m.created_at > fc.created_at);
      if (!fm) return;
      times.push((new Date(fm.created_at).getTime() - new Date(fc.created_at).getTime()) / 60000);
    });
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }, [filteredConvs, msgs]);

  const convsByDay = useMemo(() => {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    const days = Math.min(Math.max(diffDays, 1), 31);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
      const count = filteredConvs.filter(c => {
        const cd = new Date(c.created_at);
        return cd >= d && cd < next;
      }).length;
      return { label, count };
    });
  }, [filteredConvs, start, end]);

  const agentConvTable = useMemo(() => {
    const convMsgsMap: Record<string, MsgRow[]> = {};
    msgs.forEach(m => {
      if (!convMsgsMap[m.conversation_id]) convMsgsMap[m.conversation_id] = [];
      convMsgsMap[m.conversation_id].push(m);
    });
    const map: Record<string, { count: number; times: number[] }> = {};
    filteredConvs.forEach(c => {
      const aid = c.assigned_to ?? "__none__";
      if (!map[aid]) map[aid] = { count: 0, times: [] };
      map[aid].count++;
      const ms = convMsgsMap[c.id];
      if (ms) {
        const sorted = [...ms].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const fc = sorted.find(m => m.from_type === "contact");
        if (fc) {
          const fm = sorted.find(m => m.from_type === "me" && m.created_at > fc.created_at);
          if (fm) map[aid].times.push((new Date(fm.created_at).getTime() - new Date(fc.created_at).getTime()) / 60000);
        }
      }
    });
    return Object.entries(map).map(([id, d]) => {
      const agent = agents.find(a => a.id === id);
      const name = id === "__none__" ? "Sin asignar" : (agent?.display_name ?? "Agente");
      const avgTime = d.times.length > 0 ? d.times.reduce((a, b) => a + b, 0) / d.times.length : null;
      return { id, name, count: d.count, avgTime };
    }).sort((a, b) => b.count - a.count);
  }, [filteredConvs, msgs, agents]);

  const funnelData = useMemo(() => {
    const freeStages = stages
      .filter(s => !s.is_fixed && (selPipeline === "all" || s.pipeline_id === selPipeline))
      .sort((a, b) => a.position - b.position);
    return freeStages.map(s => ({
      name: s.name,
      color: s.color,
      count: filteredCards.filter(c => c.stage_id === s.id && !c.status).length,
    }));
  }, [stages, filteredCards, selPipeline]);

  const wonLostByWeek = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const wEnd = new Date(); wEnd.setDate(wEnd.getDate() - (5 - i) * 7); wEnd.setHours(23, 59, 59, 999);
      const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6); wStart.setHours(0, 0, 0, 0);
      return {
        label: `S${i + 1}`,
        won: filteredCards.filter(c => c.status === "won" && inRange(c.closed_at, wStart, wEnd)).length,
        lost: filteredCards.filter(c => c.status === "lost" && inRange(c.closed_at, wStart, wEnd)).length,
      };
    });
  }, [filteredCards]);

  const agentRanking = useMemo(() => {
    const map: Record<string, { won: number; lost: number; revenue: number }> = {};
    filteredCards.forEach(c => {
      const aid = c.assigned_to ?? "__none__";
      if (!map[aid]) map[aid] = { won: 0, lost: 0, revenue: 0 };
      if (c.status === "won" && inRange(c.closed_at, start, end)) {
        map[aid].won++;
        map[aid].revenue += c.won_amount ?? 0;
      }
      if (c.status === "lost" && inRange(c.closed_at, start, end)) map[aid].lost++;
    });
    return Object.entries(map)
      .map(([id, d]) => {
        const agent = agents.find(a => a.id === id);
        const name = id === "__none__" ? "Sin asignar" : (agent?.display_name ?? "Agente");
        const tot = d.won + d.lost;
        return { name, won: d.won, revenue: d.revenue, rate: tot > 0 ? (d.won / tot) * 100 : 0 };
      })
      .filter(r => r.won > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredCards, agents, start, end]);

  // chart maxes
  const maxDay = Math.max(...convsByDay.map(d => d.count), 1);
  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);
  const maxWL = Math.max(...wonLostByWeek.flatMap(w => [w.won, w.lost]), 1);

  const kpis = [
    { label: "Conversaciones", value: String(filteredConvs.length), sub: "en el período", color: "#3b82f6" },
    { label: "WA / IG / Msg", value: `${channelCounts.whatsapp ?? 0} / ${channelCounts.instagram ?? 0} / ${channelCounts.messenger ?? 0}`, sub: "por canal social", color: "#25D366" },
    { label: "T. respuesta", value: avgResponseMins > 0 ? fmtMins(avgResponseMins) : "—", sub: "promedio primera resp.", color: "#f59e0b" },
    { label: "Deals ganados", value: String(wonCards.length), sub: `de ${wonCards.length + lostCards.length} cerrados`, color: "#c8f135" },
    { label: "Ingresos", value: `$${revenue.toLocaleString()}`, sub: "deals ganados", color: "#8b5cf6" },
    { label: "Tasa de cierre", value: `${closeRate.toFixed(1)}%`, sub: "won / (won + lost)", color: "#ef4444" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px", ...style }}>
      {children}
    </div>
  );

  const cardTitle = (title: string, sub: string) => (
    <>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 3px" }}>{title}</p>
      <p style={{ fontSize: "11px", color: "#444", margin: "0 0 18px" }}>{sub}</p>
    </>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0a0a" }}>
      <div style={{ padding: "24px", maxWidth: "1200px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Métricas</h1>
            <p style={{ fontSize: "11px", color: "#444", margin: "3px 0 0" }}>Analítica de conversaciones y pipeline</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Sel value={period} onChange={v => setPeriod(v as PeriodKey)}
              options={[
                { value: "hoy", label: "Hoy" },
                { value: "semana", label: "Esta semana" },
                { value: "mes", label: "Este mes" },
                { value: "custom", label: "Personalizado" },
              ]}
            />
            {period === "custom" && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "11px", padding: "6px 10px", outline: "none" }} />
                <span style={{ fontSize: "11px", color: "#444" }}>–</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "11px", padding: "6px 10px", outline: "none" }} />
              </>
            )}
            <Sel value={selPipeline} onChange={setSelPipeline}
              options={[{ value: "all", label: "Todos los pipelines" }, ...pipelines.map(p => ({ value: p.id, label: p.name }))]}
            />
            <Sel value={selAgent} onChange={setSelAgent}
              options={[{ value: "all", label: "Todos los agentes" }, ...agents.filter(a => a.display_name).map(a => ({ value: a.id, label: a.display_name! }))]}
            />
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "14px" }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "16px 14px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: k.color, marginBottom: "14px" }} />
              <p style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px", lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#888", margin: "0 0 2px" }}>{k.label}</p>
              <p style={{ fontSize: "10px", color: "#333", margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Convs/day + agent table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "12px", marginBottom: "12px" }}>
          {card(
            <>
              {cardTitle("Conversaciones por día", "Nuevas en el período seleccionado")}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "80px", overflowX: "auto" }}>
                {convsByDay.map((d, i) => {
                  const h = Math.round((d.count / maxDay) * 100);
                  return (
                    <div key={i} title={`${d.label}: ${d.count}`}
                      style={{ flex: "0 0 auto", minWidth: "20px", maxWidth: "36px", width: `calc(100% / ${convsByDay.length})`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch" }}>
                      <div style={{ borderRadius: "3px 3px 0 0", height: `${Math.max(h, d.count > 0 ? 4 : 0)}%`, minHeight: d.count > 0 ? "4px" : "0", background: d.count > 0 ? "#3b82f6" : "#1a1a1a", transition: "height 0.2s" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "14px", marginTop: "14px", flexWrap: "wrap" }}>
                {(["whatsapp", "instagram", "messenger"] as const).map(ch => (
                  <div key={ch} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: CHANNEL_COLOR[ch] }} />
                    <span style={{ fontSize: "10px", color: "#555" }}>
                      {ch === "whatsapp" ? "WhatsApp" : ch === "instagram" ? "Instagram" : "Messenger"}
                      {": "}
                      <span style={{ color: "#f0f0f0", fontWeight: 700 }}>{channelCounts[ch] ?? 0}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {card(
            <>
              {cardTitle("Por agente", "Conversaciones atendidas")}
              {agentConvTable.length === 0 ? (
                <p style={{ fontSize: "11px", color: "#333" }}>Sin datos en el período</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["Agente", "Conv.", "T. resp."].map(h => (
                        <th key={h} style={{ textAlign: "left", paddingBottom: "8px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentConvTable.map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: i < agentConvTable.length - 1 ? "1px solid #161616" : "none" }}>
                        <td style={{ padding: "9px 0", fontSize: "11px", color: row.id === "__none__" ? "#555" : "#f0f0f0" }}>{row.name}</td>
                        <td style={{ padding: "9px 0", fontSize: "12px", fontWeight: 700, color: "#c8f135" }}>{row.count}</td>
                        <td style={{ padding: "9px 0", fontSize: "11px", color: "#555" }}>{row.avgTime != null ? fmtMins(row.avgTime) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Funnel + Won/Lost by week */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          {card(
            <>
              {cardTitle("Embudo de ventas", selPipeline === "all" ? "Deals activos · todos los pipelines" : "Deals activos por etapa")}
              {funnelData.length === 0 ? (
                <p style={{ fontSize: "11px", color: "#333" }}>Sin etapas</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {funnelData.map(row => {
                    const pct = Math.round((row.count / maxFunnel) * 100);
                    return (
                      <div key={row.name + row.color}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: row.color }} />
                            <span style={{ fontSize: "11px", color: "#888" }}>{row.name}</span>
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0" }}>{row.count}</span>
                        </div>
                        <div style={{ height: "6px", background: "#161616", borderRadius: "6px" }}>
                          <div style={{ height: "6px", borderRadius: "6px", width: `${pct}%`, background: row.color, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {card(
            <>
              {cardTitle("Ganados vs Perdidos", "Últimas 6 semanas")}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
                {wonLostByWeek.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", gap: "2px", height: "64px" }}>
                      <div title={`Ganados: ${w.won}`}
                        style={{ flex: 1, height: `${w.won > 0 ? Math.max((w.won / maxWL) * 100, 4) : 0}%`, background: "#c8f135", borderRadius: "3px 3px 0 0", minHeight: w.won > 0 ? "4px" : "0", transition: "height 0.2s" }} />
                      <div title={`Perdidos: ${w.lost}`}
                        style={{ flex: 1, height: `${w.lost > 0 ? Math.max((w.lost / maxWL) * 100, 4) : 0}%`, background: "#ef4444", borderRadius: "3px 3px 0 0", minHeight: w.lost > 0 ? "4px" : "0", transition: "height 0.2s" }} />
                    </div>
                    <span style={{ fontSize: "9px", color: "#444" }}>{w.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                {[["#c8f135", "Ganados"], ["#ef4444", "Perdidos"]].map(([color, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                    <span style={{ fontSize: "10px", color: "#555" }}>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Avg deal value + Agent ranking */}
        <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: "12px" }}>
          {card(
            <>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8b5cf6", marginBottom: "18px" }} />
              <p style={{ fontSize: "26px", fontWeight: 800, color: "#f0f0f0", margin: "0 0 6px", lineHeight: 1 }}>
                {avgWonValue > 0 ? `$${Math.round(avgWonValue).toLocaleString()}` : "—"}
              </p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#888", margin: 0 }}>Valor promedio</p>
              <p style={{ fontSize: "10px", color: "#333", margin: "3px 0 0" }}>por deal ganado</p>
            </>,
            { display: "flex", flexDirection: "column", justifyContent: "center" }
          )}
          {card(
            <>
              {cardTitle("Ranking de agentes", "Por deals ganados en el período")}
              {agentRanking.length === 0 ? (
                <p style={{ fontSize: "11px", color: "#333" }}>Sin deals ganados en el período</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["#", "Agente", "Deals", "Ingresos", "T. cierre"].map(h => (
                        <th key={h} style={{ textAlign: "left", paddingBottom: "8px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentRanking.map((r, i) => (
                      <tr key={r.name} style={{ borderBottom: i < agentRanking.length - 1 ? "1px solid #161616" : "none" }}>
                        <td style={{ padding: "10px 0", fontSize: "11px", fontWeight: 700, color: i === 0 ? "#c8f135" : "#444" }}>#{i + 1}</td>
                        <td style={{ padding: "10px 0", fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>{r.name}</td>
                        <td style={{ padding: "10px 0", fontSize: "12px", fontWeight: 700, color: "#c8f135" }}>{r.won}</td>
                        <td style={{ padding: "10px 0", fontSize: "12px", color: "#888" }}>${r.revenue.toLocaleString()}</td>
                        <td style={{ padding: "10px 0" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "#c8f13515", color: "#c8f135" }}>
                            {r.rate.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
