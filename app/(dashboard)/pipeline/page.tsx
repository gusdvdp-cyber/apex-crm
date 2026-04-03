"use client";

import { useEffect, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Deal {
  id: string;
  title: string;
  value: number;
  tag: string;
  tag_color: string;
  days: number;
  column_id: string;
}

interface Column {
  id: string;
  label: string;
  color: string;
  position: number;
  deals: Deal[];
}

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: cols } = await supabase.from("pipeline_columns").select("*").order("position");
    const { data: deals } = await supabase.from("deals").select("*");
    if (cols && deals) {
      setColumns(cols.map((col) => ({ ...col, deals: deals.filter((d) => d.column_id === col.id) })));
    }
    setLoading(false);
  };

  const handleDrop = async (targetColId: string) => {
    if (!dragging) return;
    const supabase = createClient();
    await supabase.from("deals").update({ column_id: targetColId }).eq("id", dragging);
    setColumns((prev) => {
      const deal = prev.flatMap((c) => c.deals).find((d) => d.id === dragging);
      if (!deal) return prev;
      return prev.map((col) => ({
        ...col,
        deals: col.id === targetColId
          ? col.deals.find((d) => d.id === dragging) ? col.deals : [...col.deals, { ...deal, column_id: targetColId }]
          : col.deals.filter((d) => d.id !== dragging),
      }));
    });
    setDragging(null);
    setDragOver(null);
  };

  const totalValue = columns.flatMap((c) => c.deals).reduce((acc, d) => acc + Number(d.value), 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0a0a0a" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Pipeline</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "4px 0 0" }}>
            {columns.flatMap((c) => c.deals).length} oportunidades ·{" "}
            <span style={{ color: "#c8f135", fontWeight: 700 }}>${totalValue.toLocaleString()}</span>
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "32px", borderRadius: "8px", background: "#c8f135", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
          <Plus size={13} />
          Nueva oportunidad
        </button>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ display: "flex", gap: "12px", padding: "20px 24px", height: "100%", minWidth: "max-content" }}>
          {columns.map((col) => (
            <div
              key={col.id}
              style={{
                display: "flex", flexDirection: "column",
                width: "250px", flexShrink: 0, height: "100%",
                background: dragOver === col.id ? "#c8f13508" : "#0d0d0d",
                border: `1px solid ${dragOver === col.id ? "#c8f13530" : "#1a1a1a"}`,
                borderRadius: "14px", transition: "all 0.15s ease",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Col header */}
              <div style={{ padding: "14px 14px 10px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: col.color }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0" }}>{col.label}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "6px", background: "#161616", color: "#444" }}>
                      {col.deals.length}
                    </span>
                  </div>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                    <Plus size={13} color="#333" />
                  </button>
                </div>
                {/* Valor total columna */}
                <p style={{ fontSize: "10px", color: "#444", margin: "6px 0 0", fontWeight: 600 }}>
                  ${col.deals.reduce((a, d) => a + Number(d.value), 0).toLocaleString()}
                </p>
              </div>

              {/* Divisor */}
              <div style={{ height: "1px", background: "#161616", margin: "0 14px" }} />

              {/* Cards */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {col.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragging(deal.id)}
                    style={{
                      padding: "12px 14px",
                      background: dragging === deal.id ? "#161616" : "#111",
                      border: "1px solid #1e1e1e",
                      borderRadius: "10px",
                      cursor: "grab",
                      opacity: dragging === deal.id ? 0.4 : 1,
                      transition: "all 0.1s ease",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => { if (dragging !== deal.id) (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: deal.tag_color + "20", color: deal.tag_color }}>
                        {deal.tag}
                      </span>
                      <button style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                        <MoreVertical size={12} color="#333" />
                      </button>
                    </div>

                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 10px" }}>
                      {deal.title}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#c8f135" }}>
                        ${Number(deal.value).toLocaleString()}
                      </span>
                      <span style={{ fontSize: "9px", color: deal.days > 10 ? "#ff4444" : "#444", fontWeight: 600 }}>
                        {deal.days}d
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: "2px", background: "#1e1e1e", borderRadius: "2px" }}>
                      <div style={{
                        height: "2px", borderRadius: "2px",
                        width: `${Math.min((deal.days / 30) * 100, 100)}%`,
                        background: deal.days > 10 ? "#ff4444" : col.color,
                      }} />
                    </div>
                  </div>
                ))}

                {col.deals.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80px", border: "1px dashed #1e1e1e", borderRadius: "10px" }}>
                    <p style={{ fontSize: "11px", color: "#333" }}>Arrastrá aquí</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}