"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface StatsData {
  totalValue: number;
  totalContacts: number;
  totalDeals: number;
  closedDeals: number;
}

interface PipelineStage {
  label: string;
  color: string;
  value: number;
  count: number;
}

interface TopDeal {
  title: string;
  value: number;
  tag: string;
  tag_color: string;
  stage: string;
  stage_color: string;
}

const monthlyMock = [
  { mes: "Oct", valor: 18200 },
  { mes: "Nov", valor: 21500 },
  { mes: "Dic", valor: 19800 },
  { mes: "Ene", valor: 23100 },
  { mes: "Feb", valor: 22400 },
  { mes: "Mar", valor: 0 },
];

export default function MetricasPage() {
  const [stats, setStats] = useState<StatsData>({ totalValue: 0, totalContacts: 0, totalDeals: 0, closedDeals: 0 });
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const supabase = createClient();
    const [{ data: contacts }, { data: deals }, { data: columns }] = await Promise.all([
      supabase.from("contacts").select("id"),
      supabase.from("deals").select("*, pipeline_columns(label, color)"),
      supabase.from("pipeline_columns").select("*").order("position"),
    ]);

    if (contacts && deals && columns) {
      const totalValue = deals.reduce((acc, d) => acc + Number(d.value), 0);
      const closedCol = columns.find((c) => c.label === "Cerrado");
      const closedDeals = closedCol ? deals.filter((d) => d.column_id === closedCol.id).length : 0;

      setStats({ totalValue, totalContacts: contacts.length, totalDeals: deals.length, closedDeals });

      setPipelineStages(columns.map((col) => {
        const colDeals = deals.filter((d) => d.column_id === col.id);
        return { label: col.label, color: col.color, value: colDeals.reduce((acc, d) => acc + Number(d.value), 0), count: colDeals.length };
      }));

      setTopDeals([...deals].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 4).map((d) => ({
        title: d.title, value: Number(d.value), tag: d.tag, tag_color: d.tag_color,
        stage: (d.pipeline_columns as any)?.label ?? "",
        stage_color: (d.pipeline_columns as any)?.color ?? "#444",
      })));

      monthlyMock[5].valor = totalValue;
    }
    setLoading(false);
  };

  const maxValor = Math.max(...monthlyMock.map((d) => d.valor));
  const maxPipelineValue = Math.max(...pipelineStages.map((s) => s.value), 1);

  const kpis = [
    { label: "Valor total pipeline", value: `$${stats.totalValue.toLocaleString()}`, change: "+12%", up: true, icon: DollarSign, color: "#c8f135" },
    { label: "Contactos", value: String(stats.totalContacts), change: "+8%", up: true, icon: Users, color: "#7c3aed" },
    { label: "Deals activos", value: String(stats.totalDeals), change: "+5%", up: true, icon: Target, color: "#0891b2" },
    { label: "Deals cerrados", value: String(stats.closedDeals), change: "0%", up: true, icon: MessageCircle, color: "#f59e0b" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0a0a" }}>
      <div style={{ padding: "24px", maxWidth: "1100px" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Métricas</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>Resumen en tiempo real</p>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
          {kpis.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} color={s.color} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "20px", background: s.up ? "#c8f13515" : "#ff444415", fontSize: "10px", fontWeight: 700, color: s.up ? "#c8f135" : "#ff4444" }}>
                    {s.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {s.change}
                  </div>
                </div>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Gráfico + Pipeline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "12px", marginBottom: "12px" }}>

          {/* Barras */}
          <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Valor acumulado</p>
                <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>Últimos 6 meses</p>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#c8f13515", color: "#c8f135" }}>
                +12% vs anterior
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px" }}>
              {monthlyMock.map((d, i) => {
                const height = maxValor > 0 ? (d.valor / maxValor) * 100 : 0;
                const isLast = i === monthlyMock.length - 1;
                return (
                  <div key={d.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: isLast ? "#c8f135" : "transparent" }}>
                      ${(d.valor / 1000).toFixed(1)}k
                    </span>
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: "80px" }}>
                      <div style={{
                        width: "100%", borderRadius: "6px 6px 0 0",
                        height: `${height}%`,
                        background: isLast ? "#c8f135" : "#1e1e1e",
                        transition: "height 0.3s ease",
                        minHeight: "4px",
                      }} />
                    </div>
                    <span style={{ fontSize: "10px", color: "#444" }}>{d.mes}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline por etapa */}
          <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Pipeline por etapa</p>
            <p style={{ fontSize: "11px", color: "#444", margin: "0 0 20px" }}>Valor por columna</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {pipelineStages.map((p) => {
                const pct = Math.round((p.value / maxPipelineValue) * 100);
                return (
                  <div key={p.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color }} />
                        <span style={{ fontSize: "11px", color: "#555" }}>{p.label}</span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0" }}>${p.value.toLocaleString()}</span>
                    </div>
                    <div style={{ height: "3px", background: "#161616", borderRadius: "3px" }}>
                      <div style={{ height: "3px", borderRadius: "3px", width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top deals */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 16px" }}>Top oportunidades</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Oportunidad", "Etapa", "Valor"].map((h) => (
                  <th key={h} style={{ textAlign: "left", paddingBottom: "10px", fontSize: "10px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topDeals.map((d, i) => (
                <tr key={i} style={{ borderBottom: i < topDeals.length - 1 ? "1px solid #161616" : "none" }}>
                  <td style={{ padding: "12px 0", fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>{d.title}</td>
                  <td style={{ padding: "12px 0" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: d.stage_color + "20", color: d.stage_color }}>
                      {d.stage}
                    </span>
                  </td>
                  <td style={{ padding: "12px 0", fontSize: "13px", fontWeight: 800, color: "#c8f135" }}>
                    ${d.value.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}