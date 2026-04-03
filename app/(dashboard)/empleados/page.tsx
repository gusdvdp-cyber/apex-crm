"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, Check, LayoutGrid, List, Search,
  Phone, Mail, Calendar, DollarSign, Clock,
  ChevronRight, Trash2, UserCheck, User,
} from "lucide-react";

interface Schedule { id?: string; day_of_week: number; start_time: string; end_time: string; }
interface PayrollRecord {
  id: string; period: string; base_salary: number; bonuses: number;
  deductions: number; total: number; status: string; paid_at: string | null; notes: string | null;
}
interface Employee {
  id: string; full_name: string; role: string; email: string | null;
  phone: string | null; avatar_url: string | null; department: string | null;
  status: string; hire_date: string | null; salary: number; salary_type: string; notes: string | null;
}

const STATUS_LABELS: Record<string, string> = { active: "Activo", inactive: "Inactivo", vacation: "Vacaciones" };
const STATUS_COLORS: Record<string, string> = { active: "#22c55e", inactive: "#ff4444", vacation: "#ff9500" };
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DEPT_COLORS: Record<string, string> = {
  "Dirección": "#c8f135", "Producto": "#0057ff", "Tech": "#a855f7",
  "Diseño": "#ff9500", "Ventas": "#22c55e", "Admin": "#ff4444",
};

const fmt = (n: number) => `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export default function EmpleadosPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "horarios" | "nomina">("info");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [payForm, setPayForm] = useState({ period: currentPeriod(), bonuses: 0, deductions: 0, notes: "" });
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [form, setForm] = useState({
    full_name: "", role: "", email: "", phone: "",
    department: "", status: "active", hire_date: "",
    salary: 0, salary_type: "monthly", notes: "",
  });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) return;
    setOrgId(profile.organization_id);
    await fetchEmployees(profile.organization_id);
    setLoading(false);
  };

  const fetchEmployees = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("employees").select("*").eq("organization_id", oid).order("full_name");
    setEmployees(data ?? []);
  };

  const fetchSchedules = async (empId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("employee_schedules").select("*").eq("employee_id", empId).order("day_of_week");
    setSchedules(data ?? []);
  };

  const fetchPayroll = async (empId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("payroll_records").select("*").eq("employee_id", empId).order("period", { ascending: false });
    setPayroll(data ?? []);
  };

  const openNew = () => {
    setSelected(null);
    setForm({ full_name: "", role: "", email: "", phone: "", department: "", status: "active", hire_date: "", salary: 0, salary_type: "monthly", notes: "" });
    setSchedules([]);
    setPayroll([]);
    setActiveTab("info");
    setShowModal(true);
  };

  const openEdit = async (emp: Employee) => {
    setSelected(emp);
    setForm({
      full_name: emp.full_name, role: emp.role, email: emp.email ?? "",
      phone: emp.phone ?? "", department: emp.department ?? "",
      status: emp.status, hire_date: emp.hire_date ?? "",
      salary: emp.salary, salary_type: emp.salary_type, notes: emp.notes ?? "",
    });
    setActiveTab("info");
    setShowModal(true);
    await Promise.all([fetchSchedules(emp.id), fetchPayroll(emp.id)]);
  };

  const save = async () => {
    if (!orgId || !form.full_name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      full_name: form.full_name, role: form.role,
      email: form.email || null, phone: form.phone || null,
      department: form.department || null, status: form.status,
      hire_date: form.hire_date || null, salary: form.salary,
      salary_type: form.salary_type, notes: form.notes || null,
    };
    if (selected) {
      await supabase.from("employees").update(payload).eq("id", selected.id);
    } else {
      await supabase.from("employees").insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    fetchEmployees(orgId);
  };

  const deleteEmployee = async () => {
    if (!selected || !orgId) return;
    const supabase = createClient();
    await supabase.from("employees").delete().eq("id", selected.id);
    setShowModal(false);
    fetchEmployees(orgId);
  };

  // ── Horarios ─────────────────────────────────────────
  const addSchedule = () => setSchedules([...schedules, { day_of_week: 1, start_time: "09:00", end_time: "18:00" }]);
  const removeSchedule = (i: number) => setSchedules(schedules.filter((_, idx) => idx !== i));
  const updateSchedule = (i: number, field: keyof Schedule, val: string | number) => {
    const s = [...schedules];
    (s[i] as any)[field] = val;
    setSchedules(s);
  };

  const saveSchedules = async () => {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("employee_schedules").delete().eq("employee_id", selected.id);
    if (schedules.length) {
      await supabase.from("employee_schedules").insert(
        schedules.map((s) => ({ employee_id: selected.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }))
      );
    }
    setSaving(false);
  };

  // ── Nómina ────────────────────────────────────────────
  const savePayroll = async () => {
    if (!selected || !orgId) return;
    setSavingPayroll(true);
    const supabase = createClient();
    const base = selected.salary;
    const total = base + Number(payForm.bonuses) - Number(payForm.deductions);
    await supabase.from("payroll_records").insert({
      employee_id: selected.id, organization_id: orgId,
      period: payForm.period, base_salary: base,
      bonuses: payForm.bonuses, deductions: payForm.deductions,
      total, status: "pending", notes: payForm.notes || null,
    });
    setPayForm({ period: currentPeriod(), bonuses: 0, deductions: 0, notes: "" });
    setSavingPayroll(false);
    fetchPayroll(selected.id);
  };

  const markPaid = async (rec: PayrollRecord) => {
    const supabase = createClient();
    await supabase.from("payroll_records").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", rec.id);
    fetchPayroll(selected!.id);
  };

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    (e.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const deptColor = (dept: string | null) => DEPT_COLORS[dept ?? ""] ?? "#555";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontSize: "12px", color: "#444" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #161616", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>Empleados</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "2px 0 0" }}>
            {employees.filter(e => e.status === "active").length} activos · {employees.length} total
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#444" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empleado..." style={{ padding: "7px 12px 7px 30px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", width: "200px" }} />
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2px", gap: "2px" }}>
          {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ width: "30px", height: "28px", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === v ? "#1e1e1e" : "transparent", color: viewMode === v ? "#f0f0f0" : "#555" }}>
              <Icon size={13} />
            </button>
          ))}
        </div>

        <button onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}>
          <Plus size={13} /> Nuevo empleado
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* Grid view */}
        {viewMode === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
            {filtered.map((emp) => (
              <div key={emp.id} onClick={() => openEdit(emp)}
                style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "20px", cursor: "pointer", transition: "border-color 0.15s, transform 0.1s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = deptColor(emp.department); }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; }}
              >
                {/* Avatar */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: deptColor(emp.department) + "22", border: `1px solid ${deptColor(emp.department)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: deptColor(emp.department) }}>
                    {initials(emp.full_name)}
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "3px 8px", borderRadius: "5px", background: STATUS_COLORS[emp.status] + "18", color: STATUS_COLORS[emp.status] }}>
                    {STATUS_LABELS[emp.status]}
                  </span>
                </div>

                <p style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 2px" }}>{emp.full_name}</p>
                <p style={{ fontSize: "11px", color: deptColor(emp.department), fontWeight: 600, margin: "0 0 12px" }}>{emp.role}</p>

                {emp.department && (
                  <span style={{ fontSize: "9px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "#1a1a1a", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {emp.department}
                  </span>
                )}

                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#444" }}>{fmt(emp.salary)}<span style={{ fontSize: "9px" }}>/{emp.salary_type === "monthly" ? "mes" : "hr"}</span></span>
                  <ChevronRight size={13} color="#333" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 130px 130px 100px 120px 40px", gap: "12px", padding: "0 16px 8px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span /><span>Empleado</span><span>Departamento</span><span>Contacto</span><span>Salario</span><span>Estado</span><span />
            </div>
            {filtered.map((emp) => (
              <div key={emp.id}
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 130px 130px 100px 120px 40px", gap: "12px", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "#0d0d0d", border: "1px solid #1a1a1a", transition: "border-color 0.15s", cursor: "pointer" }}
                onClick={() => openEdit(emp)}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: deptColor(emp.department) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: deptColor(emp.department) }}>
                  {initials(emp.full_name)}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{emp.full_name}</p>
                  <p style={{ fontSize: "10px", color: "#444", margin: "1px 0 0" }}>{emp.role}</p>
                </div>
                <span style={{ fontSize: "11px", color: deptColor(emp.department), fontWeight: 600 }}>{emp.department ?? "—"}</span>
                <div>
                  {emp.email && <p style={{ fontSize: "10px", color: "#555", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.email}</p>}
                  {emp.phone && <p style={{ fontSize: "10px", color: "#444", margin: "2px 0 0" }}>{emp.phone}</p>}
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0" }}>{fmt(emp.salary)}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "5px", background: STATUS_COLORS[emp.status] + "18", color: STATUS_COLORS[emp.status] }}>
                  {STATUS_LABELS[emp.status]}
                </span>
                <ChevronRight size={13} color="#333" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "24px", width: "580px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {selected && (
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: deptColor(selected.department) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: deptColor(selected.department) }}>
                    {initials(selected.full_name)}
                  </div>
                )}
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#f0f0f0" }}>
                  {selected ? selected.full_name : "Nuevo empleado"}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2px", gap: "2px" }}>
              {([["info", "Información", User], ["horarios", "Horarios", Clock], ["nomina", "Nómina", DollarSign]] as const).map(([val, label, Icon]) => (
                <button key={val}
                  onClick={() => setActiveTab(val)}
                  disabled={val !== "info" && !selected}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", borderRadius: "6px", border: "none", cursor: val !== "info" && !selected ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: 600, background: activeTab === val ? "#1e1e1e" : "transparent", color: activeTab === val ? "#f0f0f0" : "#444", transition: "all 0.15s", opacity: val !== "info" && !selected ? 0.4 : 1 }}>
                  <Icon size={11} />{label}
                </button>
              ))}
            </div>

            {/* ── Tab: Info ── */}
            {activeTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Nombre completo *</label>
                    <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} placeholder="Juan García" />
                  </div>
                  <div>
                    <label style={labelStyle}>Rol / Cargo</label>
                    <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle} placeholder="Desarrollador" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="juan@empresa.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+54 351 000 0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Departamento</label>
                    <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={inputStyle} placeholder="Tech, Ventas, Admin..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha de ingreso</label>
                    <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Tipo de salario</label>
                    <select value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })} style={inputStyle}>
                      <option value="monthly">Mensual</option>
                      <option value="hourly">Por hora</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Salario base (USD)</label>
                  <input type="number" value={form.salary} min={0} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Notas internas</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            {/* ── Tab: Horarios ── */}
            {activeTab === "horarios" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {schedules.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#444", textAlign: "center", padding: "20px 0" }}>Sin horarios cargados</p>
                )}
                {schedules.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 32px", gap: "8px", alignItems: "center" }}>
                    <select value={s.day_of_week} onChange={(e) => updateSchedule(i, "day_of_week", Number(e.target.value))} style={inputStyle}>
                      {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                    <input type="time" value={s.start_time} onChange={(e) => updateSchedule(i, "start_time", e.target.value)} style={inputStyle} />
                    <input type="time" value={s.end_time} onChange={(e) => updateSchedule(i, "end_time", e.target.value)} style={inputStyle} />
                    <button onClick={() => removeSchedule(i)} style={{ width: "28px", height: "28px", borderRadius: "6px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button onClick={addSchedule} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "transparent", border: "1px dashed #1e1e1e", cursor: "pointer", fontSize: "11px", color: "#555", fontWeight: 600 }}>
                  <Plus size={12} /> Agregar día
                </button>
                <button onClick={saveSchedules} disabled={saving} style={{ alignSelf: "flex-end", padding: "0 16px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}>
                  {saving ? "Guardando..." : "Guardar horarios"}
                </button>
              </div>
            )}

            {/* ── Tab: Nómina ── */}
            {activeTab === "nomina" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Nuevo registro */}
                <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 12px" }}>Registrar pago</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={labelStyle}>Período</label>
                      <input type="month" value={payForm.period} onChange={(e) => setPayForm({ ...payForm, period: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bonificaciones</label>
                      <input type="number" value={payForm.bonuses} min={0} onChange={(e) => setPayForm({ ...payForm, bonuses: Number(e.target.value) })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Deducciones</label>
                      <input type="number" value={payForm.deductions} min={0} onChange={(e) => setPayForm({ ...payForm, deductions: Number(e.target.value) })} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
                      Total: {fmt(selected!.salary + Number(payForm.bonuses) - Number(payForm.deductions))}
                    </span>
                    <button onClick={savePayroll} disabled={savingPayroll} style={{ padding: "0 14px", height: "32px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
                      {savingPayroll ? "..." : "Registrar"}
                    </button>
                  </div>
                </div>

                {/* Historial */}
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Historial</p>
                  {payroll.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#444", textAlign: "center", padding: "16px 0" }}>Sin registros</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {payroll.map((rec) => (
                        <div key={rec.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                          <div>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", fontFamily: "monospace" }}>{rec.period}</span>
                            {rec.bonuses > 0 && <span style={{ fontSize: "10px", color: "#22c55e", marginLeft: "8px" }}>+{fmt(rec.bonuses)}</span>}
                            {rec.deductions > 0 && <span style={{ fontSize: "10px", color: "#ff4444", marginLeft: "6px" }}>-{fmt(rec.deductions)}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#f0f0f0" }}>{fmt(rec.total)}</span>
                            {rec.status === "pending" ? (
                              <button onClick={() => markPaid(rec)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", background: "#22c55e18", border: "1px solid #22c55e40", cursor: "pointer", fontSize: "10px", fontWeight: 700, color: "#22c55e" }}>
                                <Check size={10} /> Pagar
                              </button>
                            ) : (
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e" }}>✓ Pagado</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", borderTop: "1px solid #1a1a1a" }}>
              <div>
                {selected && activeTab === "info" && (
                  <button onClick={deleteEmployee} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}>
                    Eliminar
                  </button>
                )}
              </div>
              {activeTab === "info" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                    Cancelar
                  </button>
                  <button onClick={save} disabled={saving || !form.full_name.trim()} style={{ padding: "0 18px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: saving || !form.full_name.trim() ? 0.6 : 1 }}>
                    {saving ? "Guardando..." : selected ? "Guardar" : "Crear"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, color: "#444",
  textTransform: "uppercase", letterSpacing: "0.08em",
  display: "block", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  background: "#0d0d0d", border: "1px solid #1e1e1e",
  borderRadius: "8px", color: "#f0f0f0",
  fontSize: "12px", outline: "none",
};