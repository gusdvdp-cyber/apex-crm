"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, AlignLeft, Tag, X, Check,
} from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  type: string;
  google_event_id: string | null;
}

type ViewMode = "mes" | "semana" | "agenda";

const TYPE_LABELS: Record<string, string> = {
  event: "Evento",
  meeting: "Reunión",
  task: "Tarea",
  reminder: "Recordatorio",
};

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("mes");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "event",
    color: "#c8f135",
    start_at: "",
    end_at: "",
    all_day: false,
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single();

    if (!profile) return;

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("start_at", { ascending: true });

    setEvents(data ?? []);
    setLoading(false);
  };

  const openNew = (dateStr?: string) => {
    const base = dateStr ? new Date(dateStr) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    setForm({ title: "", description: "", type: "event", color: "#c8f135", start_at: fmt(base), end_at: fmt(end), all_day: false });
    setSelectedEvent(null);
    setShowModal(true);
  };

  const openEdit = (ev: CalEvent) => {
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      type: ev.type,
      color: ev.color,
      start_at: toLocal(ev.start_at),
      end_at: toLocal(ev.end_at),
      all_day: ev.all_day,
    });
    setSelectedEvent(ev);
    setShowModal(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single();
    if (!profile) return;

    if (selectedEvent) {
      await supabase.from("events").update({
        title: form.title,
        description: form.description || null,
        type: form.type,
        color: form.color,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        all_day: form.all_day,
      }).eq("id", selectedEvent.id);
    } else {
      await supabase.from("events").insert({
        organization_id: profile.organization_id,
        title: form.title,
        description: form.description || null,
        type: form.type,
        color: form.color,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        all_day: form.all_day,
      });
    }

    setSaving(false);
    setShowModal(false);
    fetchEvents();
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", selectedEvent.id);
    setShowModal(false);
    fetchEvents();
  };

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "mes") d.setMonth(d.getMonth() + dir);
    else if (view === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir * 14);
    setCurrentDate(d);
  };

  const eventsOnDay = (date: Date) => {
    const d = date.toDateString();
    return events.filter((e) => new Date(e.start_at).toDateString() === d);
  };

  // ── VISTA MES ──────────────────────────────────────────
  const renderMes = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const today = new Date().toDateString();

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
          {DAYS_ES.map((d) => (
            <div key={d} style={{ padding: "8px 12px", fontSize: "10px", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "#161616" }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={{ background: "#0a0a0a", minHeight: "100px" }} />;
            const isToday = day.toDateString() === today;
            const dayEvents = eventsOnDay(day);
            return (
              <div
                key={i}
                onClick={() => openNew(`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}T09:00`)}
                style={{ background: "#0d0d0d", minHeight: "100px", padding: "8px", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#111"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "#0d0d0d"}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "22px", height: "22px", borderRadius: "50%",
                  fontSize: "11px", fontWeight: 600,
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#0a0a0a" : "#555",
                  marginBottom: "6px",
                }}>
                  {day.getDate()}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                      style={{
                        padding: "2px 6px", borderRadius: "4px",
                        background: ev.color + "22",
                        borderLeft: `2px solid ${ev.color}`,
                        fontSize: "10px", fontWeight: 500,
                        color: "#f0f0f0", cursor: "pointer",
                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                      }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: "9px", color: "#444", paddingLeft: "4px" }}>+{dayEvents.length - 3} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── VISTA SEMANA ───────────────────────────────────────
  const renderSemana = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
    const today = new Date().toDateString();

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "#161616" }}>
        {days.map((day, i) => {
          const isToday = day.toDateString() === today;
          const dayEvents = eventsOnDay(day);
          return (
            <div key={i} style={{ background: "#0d0d0d", minHeight: "400px" }}>
              <div style={{
                padding: "12px 8px", borderBottom: "1px solid #161616",
                textAlign: "center", background: isToday ? "#c8f13510" : "transparent",
              }}>
                <p style={{ fontSize: "9px", color: "#444", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {DAYS_ES[i]}
                </p>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "50%",
                  fontSize: "13px", fontWeight: 700,
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#0a0a0a" : "#f0f0f0",
                }}>
                  {day.getDate()}
                </span>
              </div>
              <div
                style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer" }}
                onClick={() => openNew(`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}T09:00`)}
              >
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                    style={{
                      padding: "6px 8px", borderRadius: "6px",
                      background: ev.color + "18",
                      borderLeft: `2px solid ${ev.color}`,
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 2px" }}>{ev.title}</p>
                    <p style={{ fontSize: "9px", color: "#555", margin: 0 }}>
                      {new Date(ev.start_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── VISTA AGENDA ───────────────────────────────────────
  const renderAgenda = () => {
    const upcoming = events
      .filter((e) => new Date(e.end_at) >= new Date())
      .slice(0, 30);

    if (upcoming.length === 0) return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: "13px" }}>
        No hay eventos próximos
      </div>
    );

    let lastDate = "";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {upcoming.map((ev) => {
          const d = new Date(ev.start_at);
          const dateStr = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;
          return (
            <div key={ev.id}>
              {showDate && (
                <div style={{ padding: "16px 0 8px", fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "capitalize", letterSpacing: "0.04em" }}>
                  {dateStr}
                </div>
              )}
              <div
                onClick={() => openEdit(ev)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 16px", borderRadius: "10px",
                  background: "#0d0d0d", border: "1px solid #1a1a1a",
                  cursor: "pointer", transition: "border-color 0.15s",
                  borderLeft: `3px solid ${ev.color}`,
                  marginBottom: "4px",
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = ev.color}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0f0" }}>{ev.title}</span>
                    <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "4px", background: ev.color + "22", color: ev.color, fontWeight: 600 }}>
                      {TYPE_LABELS[ev.type] ?? ev.type}
                    </span>
                  </div>
                  {ev.description && (
                    <p style={{ fontSize: "11px", color: "#444", margin: "0 0 4px" }}>{ev.description}</p>
                  )}
                  <p style={{ fontSize: "10px", color: "#555", margin: 0 }}>
                    {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} →{" "}
                    {new Date(ev.end_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const headerLabel = () => {
    if (view === "mes") return `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "semana") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()} ${MONTHS_ES[start.getMonth()]} — ${end.getDate()} ${MONTHS_ES[end.getMonth()]} ${end.getFullYear()}`;
    }
    return "Próximos eventos";
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando calendario...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #161616", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}><ChevronLeft size={14} /></button>
          <button onClick={() => setCurrentDate(new Date())} style={{ ...navBtnStyle, fontSize: "10px", padding: "0 10px", fontWeight: 600, color: "#c8f135" }}>Hoy</button>
          <button onClick={() => navigate(1)} style={navBtnStyle}><ChevronRight size={14} /></button>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", marginLeft: "8px", textTransform: "capitalize" }}>
            {headerLabel()}
          </span>
        </div>

        {/* View switcher */}
        <div style={{ display: "flex", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2px", gap: "2px" }}>
          {(["mes", "semana", "agenda"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 12px", borderRadius: "6px", border: "none", cursor: "pointer",
                fontSize: "11px", fontWeight: 600, textTransform: "capitalize",
                background: view === v ? "#1e1e1e" : "transparent",
                color: view === v ? "#f0f0f0" : "#555",
                transition: "all 0.15s",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => openNew()}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}
        >
          <Plus size={13} /> Nuevo evento
        </button>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: "auto", padding: view === "agenda" ? "16px 24px" : "0" }}>
        {view === "mes" && renderMes()}
        {view === "semana" && renderSemana()}
        {view === "agenda" && renderAgenda()}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "24px", width: "440px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0" }}>
                {selectedEvent ? "Editar evento" : "Nuevo evento"}
              </span>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}>
                <X size={16} />
              </button>
            </div>

            {/* Título */}
            <div>
              <label style={labelStyle}>Título</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nombre del evento"
                style={modalInputStyle}
              />
            </div>

            {/* Descripción */}
            <div>
              <label style={labelStyle}><AlignLeft size={10} style={{ display: "inline", marginRight: "4px" }} />Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalles opcionales..."
                rows={2}
                style={{ ...modalInputStyle, resize: "none" }}
              />
            </div>

            {/* Tipo + Color */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}><Tag size={10} style={{ display: "inline", marginRight: "4px" }} />Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ ...modalInputStyle, cursor: "pointer" }}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: "flex", gap: "6px", paddingTop: "4px" }}>
                  {["#c8f135", "#0057ff", "#ff4444", "#ff9500", "#a855f7"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: "24px", height: "24px", borderRadius: "50%", border: form.color === c ? "2px solid #fff" : "2px solid transparent",
                        background: c, cursor: "pointer", padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {form.color === c && <Check size={10} color="#000" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}><Clock size={10} style={{ display: "inline", marginRight: "4px" }} />Inicio</label>
                <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} style={modalInputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}><Clock size={10} style={{ display: "inline", marginRight: "4px" }} />Fin</label>
                <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} style={modalInputStyle} />
              </div>
            </div>

            {/* Todo el día */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setForm({ ...form, all_day: !form.all_day })}
                style={{
                  width: "18px", height: "18px", borderRadius: "4px", border: "1px solid #333",
                  background: form.all_day ? "var(--accent)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {form.all_day && <Check size={10} color="#0a0a0a" strokeWidth={3} />}
              </button>
              <span style={{ fontSize: "12px", color: "#555" }}>Todo el día</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
              {selectedEvent && (
                <button onClick={deleteEvent} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}>
                  Eliminar
                </button>
              )}
              <button onClick={() => setShowModal(false)} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                Cancelar
              </button>
              <button onClick={saveEvent} disabled={saving || !form.title.trim()} style={{ padding: "0 18px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>
                {saving ? "Guardando..." : selectedEvent ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "28px", height: "28px", borderRadius: "7px",
  background: "#111", border: "1px solid #1a1a1a",
  cursor: "pointer", color: "#555",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, color: "#444",
  textTransform: "uppercase", letterSpacing: "0.08em",
  display: "block", marginBottom: "6px",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "#0d0d0d", border: "1px solid #1e1e1e",
  borderRadius: "8px", color: "#f0f0f0",
  fontSize: "13px", outline: "none",
  boxSizing: "border-box",
};