"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, Check, ChevronRight, FileText,
  Receipt, ArrowRight, Trash2, Search, Package,
} from "lucide-react";

interface Contact { id: string; name: string; company: string | null; }
interface Product { id: string; name: string; price: number; unit: string; description: string | null; }
interface InvoiceItem {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
interface Invoice {
  id: string;
  type: "quote" | "invoice";
  status: string;
  number: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  converted_to: string | null;
  contact_id: string | null;
  contacts?: { name: string; company: string | null } | null;
  invoice_items?: InvoiceItem[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", sent: "Enviado", accepted: "Aceptado",
  rejected: "Rechazado", paid: "Pagado",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "#444", sent: "#0057ff", accepted: "#c8f135",
  rejected: "#ff4444", paid: "#22c55e",
};

export default function FacturacionPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"quote" | "invoice">("quote");
  const [showModal, setShowModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({
    type: "quote" as "quote" | "invoice",
    contact_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
    tax_rate: 0,
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 },
  ]);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) return;
    setOrgId(profile.organization_id);
    await Promise.all([
      fetchInvoices(profile.organization_id),
      fetchContacts(profile.organization_id),
      fetchProducts(profile.organization_id),
    ]);
    setLoading(false);
  };

  const fetchInvoices = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invoices")
      .select("*, contacts(name, company), invoice_items(*)")
      .eq("organization_id", oid)
      .order("created_at", { ascending: false });
    setInvoices((data as Invoice[]) ?? []);
  };

  const fetchContacts = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("contacts").select("id, name, company").eq("organization_id", oid).order("name");
    setContacts(data ?? []);
  };

  const fetchProducts = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("products").select("*").eq("organization_id", oid).eq("is_active", true).order("name");
    setProducts(data ?? []);
  };

  // ── Cálculos ─────────────────────────────────────────
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | null) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const addFromProduct = (p: Product) => {
    setItems([...items, { product_id: p.id, description: p.name, quantity: 1, unit_price: p.price, subtotal: p.price }]);
    setShowProductPicker(false);
    setProductSearch("");
  };

  const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const total = subtotal + taxAmount;

  // ── Generar número ────────────────────────────────────
  const genNumber = (type: "quote" | "invoice") => {
    const prefix = type === "quote" ? "PRES" : "FACT";
    const count = invoices.filter((i) => i.type === type).length + 1;
    return `${prefix}-${String(count).padStart(4, "0")}`;
  };

  // ── Abrir modal ───────────────────────────────────────
  const openNew = (type: "quote" | "invoice" = tab) => {
    setSelectedInvoice(null);
    setForm({ type, contact_id: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", notes: "", tax_rate: 0 });
    setItems([{ product_id: null, description: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
    setShowModal(true);
  };

  const openEdit = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setForm({
      type: inv.type,
      contact_id: inv.contact_id ?? "",
      issue_date: inv.issue_date,
      due_date: inv.due_date ?? "",
      notes: inv.notes ?? "",
      tax_rate: inv.tax_rate,
    });
    setItems(
      (inv.invoice_items ?? []).map((it) => ({
        id: it.id,
        product_id: it.product_id ?? null,
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        subtotal: Number(it.subtotal),
      }))
    );
    setShowModal(true);
  };

  // ── Guardar ───────────────────────────────────────────
  const save = async () => {
    if (!orgId || !items.some((i) => i.description.trim())) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      organization_id: orgId,
      type: form.type,
      status: selectedInvoice?.status ?? "draft",
      number: selectedInvoice?.number ?? genNumber(form.type),
      contact_id: form.contact_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
      subtotal,
      tax_rate: form.tax_rate,
      tax_amount: taxAmount,
      total,
    };

    let invoiceId = selectedInvoice?.id;

    if (selectedInvoice) {
      await supabase.from("invoices").update(payload).eq("id", selectedInvoice.id);
      await supabase.from("invoice_items").delete().eq("invoice_id", selectedInvoice.id);
    } else {
      const { data } = await supabase.from("invoices").insert(payload).select().single();
      invoiceId = data?.id;
    }

    if (invoiceId) {
      await supabase.from("invoice_items").insert(
        items.filter((i) => i.description.trim()).map((i) => ({
          invoice_id: invoiceId,
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
        }))
      );
    }

    setSaving(false);
    setShowModal(false);
    fetchInvoices(orgId);
  };

  // ── Cambiar status ────────────────────────────────────
  const changeStatus = async (inv: Invoice, status: string) => {
    const supabase = createClient();
    await supabase.from("invoices").update({ status }).eq("id", inv.id);
    fetchInvoices(orgId!);
  };

  // ── Convertir presupuesto → factura ──────────────────
  const convertToInvoice = async (inv: Invoice) => {
    if (!orgId) return;
    setConverting(true);
    const supabase = createClient();
    const newNumber = genNumber("invoice");

    const { data: newInv } = await supabase.from("invoices").insert({
      organization_id: orgId,
      type: "invoice",
      status: "draft",
      number: newNumber,
      contact_id: inv.contact_id,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: inv.due_date,
      notes: inv.notes,
      subtotal: inv.subtotal,
      tax_rate: inv.tax_rate,
      tax_amount: inv.tax_amount,
      total: inv.total,
    }).select().single();

    if (newInv) {
      const sourceItems = inv.invoice_items ?? [];
      if (sourceItems.length) {
        await supabase.from("invoice_items").insert(
          sourceItems.map((i) => ({
            invoice_id: newInv.id,
            product_id: i.product_id,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
          }))
        );
      }
      await supabase.from("invoices").update({ converted_to: newInv.id }).eq("id", inv.id);
    }

    setConverting(false);
    setTab("invoice");
    fetchInvoices(orgId);
  };

  // ── Eliminar ──────────────────────────────────────────
  const deleteInvoice = async () => {
    if (!selectedInvoice || !orgId) return;
    const supabase = createClient();
    await supabase.from("invoices").delete().eq("id", selectedInvoice.id);
    setShowModal(false);
    fetchInvoices(orgId);
  };

  const filtered = invoices.filter((i) => i.type === tab);
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const fmt = (n: number) => `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

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
          <h1 style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>Facturación</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "2px 0 0" }}>
            {invoices.filter(i => i.type === "quote").length} presupuestos · {invoices.filter(i => i.type === "invoice").length} facturas
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2px", gap: "2px" }}>
          {([["quote", "Presupuestos", FileText], ["invoice", "Facturas", Receipt]] as const).map(([val, label, Icon]) => (
            <button key={val} onClick={() => setTab(val)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: tab === val ? "#1e1e1e" : "transparent", color: tab === val ? "#f0f0f0" : "#555", transition: "all 0.15s" }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        <button onClick={() => openNew()}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}>
          <Plus size={13} /> Nuevo {tab === "quote" ? "presupuesto" : "factura"}
        </button>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: "13px" }}>
            No hay {tab === "quote" ? "presupuestos" : "facturas"} aún
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {/* Tabla header */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 100px 120px 120px 40px", gap: "12px", padding: "0 16px 8px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span>Número</span><span>Cliente</span><span>Fecha</span><span>Total</span><span>Estado</span><span></span><span></span>
            </div>

            {filtered.map((inv) => (
              <div key={inv.id}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 100px 120px 120px 40px", gap: "12px", alignItems: "center", padding: "14px 16px", borderRadius: "10px", background: "#0d0d0d", border: "1px solid #1a1a1a", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{inv.number}</span>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>
                    {inv.contacts?.name ?? "Sin cliente"}
                  </p>
                  {inv.contacts?.company && <p style={{ fontSize: "10px", color: "#444", margin: "1px 0 0" }}>{inv.contacts.company}</p>}
                </div>
                <span style={{ fontSize: "11px", color: "#555" }}>
                  {new Date(inv.issue_date).toLocaleDateString("es-AR")}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0" }}>{fmt(inv.total)}</span>

                {/* Status dropdown */}
                <select
                  value={inv.status}
                  onChange={(e) => changeStatus(inv, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "none", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: STATUS_COLORS[inv.status] + "22", color: STATUS_COLORS[inv.status], outline: "none" }}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k} style={{ background: "#111", color: "#f0f0f0" }}>{v}</option>
                  ))}
                </select>

                {/* Convertir (solo presupuestos sin convertir) */}
                {tab === "quote" && !inv.converted_to && (
                  <button
                    onClick={() => convertToInvoice(inv)}
                    disabled={converting}
                    title="Convertir a factura"
                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 8px", borderRadius: "6px", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "10px", fontWeight: 600, color: "#555", whiteSpace: "nowrap" }}
                  >
                    <ArrowRight size={11} /> Factura
                  </button>
                )}
                {tab === "quote" && inv.converted_to && (
                  <span style={{ fontSize: "9px", color: "#333", fontStyle: "italic" }}>Convertido</span>
                )}
                {tab === "invoice" && <span />}

                <button onClick={() => openEdit(inv)}
                  style={{ width: "32px", height: "32px", borderRadius: "7px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "24px", width: "680px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#f0f0f0" }}>
                  {selectedInvoice ? `Editar ${form.type === "quote" ? "presupuesto" : "factura"}` : `Nuevo ${form.type === "quote" ? "presupuesto" : "factura"}`}
                </span>
                {selectedInvoice && (
                  <span style={{ marginLeft: "10px", fontSize: "11px", fontFamily: "monospace", color: "var(--accent)" }}>{selectedInvoice.number}</span>
                )}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
            </div>

            {/* Tipo */}
            {!selectedInvoice && (
              <div style={{ display: "flex", gap: "6px" }}>
                {([["quote", "Presupuesto"], ["invoice", "Factura"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setForm({ ...form, type: val })}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.type === val ? "var(--accent)" : "#1e1e1e"}`, background: form.type === val ? "var(--accent)10" : "transparent", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: form.type === val ? "var(--accent)" : "#555" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Cliente + fechas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Cliente</label>
                <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} style={inputStyle}>
                  <option value="">Sin cliente</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha emisión</label>
                <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Vencimiento</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <label style={labelStyle}>Items</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => setShowProductPicker(true)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "6px", background: "#0d0d0d", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "10px", fontWeight: 600, color: "#555" }}>
                    <Package size={10} /> Desde catálogo
                  </button>
                  <button onClick={addItem}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "6px", background: "#0d0d0d", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "10px", fontWeight: 600, color: "#555" }}>
                    <Plus size={10} /> Línea libre
                  </button>
                </div>
              </div>

              {/* Header items */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 90px 32px", gap: "8px", marginBottom: "6px", padding: "0 4px" }}>
                {["Descripción", "Cant.", "Precio unit.", "Subtotal", ""].map((h) => (
                  <span key={h} style={{ fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 90px 32px", gap: "8px", alignItems: "center" }}>
                    <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Descripción del servicio..." style={inputStyle} />
                    <input type="number" value={item.quantity} min={0} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} style={{ ...inputStyle, textAlign: "center" }} />
                    <input type="number" value={item.unit_price} min={0} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} style={inputStyle} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", textAlign: "right" }}>{fmt(item.subtotal)}</span>
                    <button onClick={() => removeItem(i)} style={{ width: "28px", height: "28px", borderRadius: "6px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales + notas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", alignItems: "end" }}>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Condiciones, aclaraciones..." rows={3} style={{ ...inputStyle, resize: "none", width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Subtotal</span>
                  <span style={{ fontSize: "12px", color: "#f0f0f0", fontWeight: 600 }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>IVA / Imp.</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="number" value={form.tax_rate} min={0} max={100} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} style={{ ...inputStyle, width: "52px", textAlign: "center", padding: "4px 6px" }} />
                    <span style={{ fontSize: "11px", color: "#555" }}>%</span>
                    <span style={{ fontSize: "12px", color: "#f0f0f0" }}>{fmt(taxAmount)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #1e1e1e" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0" }}>Total</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--accent)" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {selectedInvoice && (
                  <button onClick={deleteInvoice} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}>
                    Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} style={{ padding: "0 18px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Guardando..." : selectedInvoice ? "Guardar" : "Crear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product picker */}
      {showProductPicker && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "20px", width: "380px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0" }}>Catálogo de productos</span>
              <button onClick={() => setShowProductPicker(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={14} /></button>
            </div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#444" }} />
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar producto..." style={{ ...inputStyle, paddingLeft: "30px", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
              {filteredProducts.map((p) => (
                <div key={p.id} onClick={() => addFromProduct(p)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a", cursor: "pointer", transition: "border-color 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"}
                >
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{p.name}</p>
                    {p.description && <p style={{ fontSize: "10px", color: "#444", margin: "2px 0 0" }}>{p.description}</p>}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", flexShrink: 0, marginLeft: "12px" }}>{fmt(p.price)}<span style={{ fontSize: "9px", color: "#444", fontWeight: 400 }}>/{p.unit}</span></span>
                </div>
              ))}
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