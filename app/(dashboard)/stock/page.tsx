"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, Search, AlertTriangle, Package,
  ArrowDownCircle, ArrowUpCircle, SlidersHorizontal,
  ChevronRight, Truck, Tag, History,
} from "lucide-react";

interface Category { id: string; name: string; color: string; }
interface Supplier { id: string; name: string; email: string | null; phone: string | null; }
interface Product {
  id: string; name: string; sku: string | null; description: string | null;
  unit: string; price_cost: number; price_sale: number;
  stock_current: number; stock_min: number; is_active: boolean;
  category_id: string | null; supplier_id: string | null;
  stock_categories?: { name: string; color: string } | null;
  suppliers?: { name: string } | null;
}
interface Movement {
  id: string; type: string; quantity: number;
  stock_before: number; stock_after: number;
  reason: string | null; created_at: string;
}

const MOV_LABELS: Record<string, string> = { in: "Entrada", out: "Salida", adjust: "Ajuste" };
const MOV_COLORS: Record<string, string> = { in: "#22c55e", out: "#ff4444", adjust: "#ff9500" };
const fmt = (n: number) => `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

export default function StockPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "movimientos">("info");
  const [selected, setSelected] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ type: "in", quantity: 1, reason: "" });
  const [savingMov, setSavingMov] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", description: "", unit: "unidad",
    price_cost: 0, price_sale: 0, stock_current: 0, stock_min: 0,
    category_id: "", supplier_id: "", is_active: true,
  });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) return;
    setOrgId(profile.organization_id);
    await Promise.all([
      fetchProducts(profile.organization_id),
      fetchCategories(profile.organization_id),
      fetchSuppliers(profile.organization_id),
    ]);
    setLoading(false);
  };

  const fetchProducts = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("stock_products")
      .select("*, stock_categories(name, color), suppliers(name)")
      .eq("organization_id", oid)
      .order("name");
    setProducts((data as Product[]) ?? []);
  };

  const fetchCategories = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("stock_categories").select("*").eq("organization_id", oid).order("name");
    setCategories(data ?? []);
  };

  const fetchSuppliers = async (oid: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("suppliers").select("*").eq("organization_id", oid).order("name");
    setSuppliers(data ?? []);
  };

  const fetchMovements = async (productId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements(data ?? []);
  };

  const openNew = () => {
    setSelected(null);
    setForm({ name: "", sku: "", description: "", unit: "unidad", price_cost: 0, price_sale: 0, stock_current: 0, stock_min: 0, category_id: "", supplier_id: "", is_active: true });
    setMovements([]);
    setActiveTab("info");
    setShowModal(true);
  };

  const openEdit = async (p: Product) => {
    setSelected(p);
    setForm({
      name: p.name, sku: p.sku ?? "", description: p.description ?? "",
      unit: p.unit, price_cost: p.price_cost, price_sale: p.price_sale,
      stock_current: p.stock_current, stock_min: p.stock_min,
      category_id: p.category_id ?? "", supplier_id: p.supplier_id ?? "",
      is_active: p.is_active,
    });
    setActiveTab("info");
    setShowModal(true);
    fetchMovements(p.id);
  };

  const save = async () => {
    if (!orgId || !form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      name: form.name, sku: form.sku || null,
      description: form.description || null, unit: form.unit,
      price_cost: form.price_cost, price_sale: form.price_sale,
      stock_current: form.stock_current, stock_min: form.stock_min,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      is_active: form.is_active,
    };
    if (selected) {
      await supabase.from("stock_products").update(payload).eq("id", selected.id);
    } else {
      await supabase.from("stock_products").insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    fetchProducts(orgId);
  };

  const deleteProduct = async () => {
    if (!selected || !orgId) return;
    const supabase = createClient();
    await supabase.from("stock_products").delete().eq("id", selected.id);
    setShowModal(false);
    fetchProducts(orgId);
  };

  // ── Movimiento de stock ───────────────────────────────
  const saveMovement = async () => {
    if (!selected || !orgId || movForm.quantity <= 0) return;
    setSavingMov(true);
    const supabase = createClient();

    const stockBefore = selected.stock_current;
    let stockAfter = stockBefore;
    if (movForm.type === "in") stockAfter = stockBefore + movForm.quantity;
    else if (movForm.type === "out") stockAfter = Math.max(0, stockBefore - movForm.quantity);
    else stockAfter = movForm.quantity; // adjust = valor absoluto

    await supabase.from("stock_movements").insert({
      organization_id: orgId,
      product_id: selected.id,
      type: movForm.type,
      quantity: movForm.quantity,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: movForm.reason || null,
    });

    await supabase.from("stock_products").update({ stock_current: stockAfter }).eq("id", selected.id);

    setSelected({ ...selected, stock_current: stockAfter });
    setMovForm({ type: "in", quantity: 1, reason: "" });
    setSavingMov(false);
    setShowMovModal(false);
    fetchMovements(selected.id);
    fetchProducts(orgId);
  };

  // ── Filtros ───────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.category_id === filterCat;
    const matchLow = !showLowStock || p.stock_current <= p.stock_min;
    return matchSearch && matchCat && matchLow;
  });

  const lowStockCount = products.filter((p) => p.stock_current <= p.stock_min).length;
  const totalValue = products.reduce((a, p) => a + p.stock_current * p.price_cost, 0);

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
          <h1 style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", margin: 0 }}>Stock</h1>
          <p style={{ fontSize: "11px", color: "#444", margin: "2px 0 0" }}>
            {products.length} productos · valor total {fmt(totalValue)}
          </p>
        </div>

        {/* Alerta stock bajo */}
        {lowStockCount > 0 && (
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: showLowStock ? "#ff444422" : "#ff444411", border: `1px solid ${showLowStock ? "#ff4444" : "#ff444430"}`, cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}
          >
            <AlertTriangle size={12} /> {lowStockCount} bajo mínimo
          </button>
        )}

        {/* Filtro categoría */}
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          style={{ padding: "7px 10px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: filterCat ? "#f0f0f0" : "#555", fontSize: "11px", outline: "none", cursor: "pointer" }}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#444" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o SKU..."
            style={{ padding: "7px 12px 7px 30px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f0f0f0", fontSize: "12px", outline: "none", width: "200px" }} />
        </div>

        <button onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a" }}>
          <Plus size={13} /> Nuevo producto
        </button>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: "flex", gap: "1px", background: "#161616", borderBottom: "1px solid #161616", flexShrink: 0 }}>
        {[
          { label: "Total productos", value: String(products.length), color: "#f0f0f0" },
          { label: "Valor en stock", value: fmt(totalValue), color: "var(--accent)" },
          { label: "Stock bajo mínimo", value: String(lowStockCount), color: lowStockCount > 0 ? "#ff4444" : "#22c55e" },
          { label: "Categorías", value: String(categories.length), color: "#f0f0f0" },
        ].map((k) => (
          <div key={k.label} style={{ flex: 1, padding: "14px 20px", background: "#0a0a0a" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>{k.label}</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: "13px" }}>
            {showLowStock ? "No hay productos bajo el mínimo" : "No hay productos"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 110px 110px 110px 110px 40px", gap: "12px", padding: "0 16px 8px", fontSize: "9px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span>Producto</span><span>Categoría</span><span>SKU</span>
              <span>Costo</span><span>Venta</span><span>Stock</span><span>Proveedor</span><span />
            </div>

            {filtered.map((p) => {
              const isLow = p.stock_current <= p.stock_min;
              const catColor = p.stock_categories?.color ?? "#555";
              return (
                <div key={p.id}
                  onClick={() => openEdit(p)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 110px 110px 110px 110px 40px", gap: "12px", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "#0d0d0d", border: `1px solid ${isLow ? "#ff444430" : "#1a1a1a"}`, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = isLow ? "#ff4444" : "#2a2a2a"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = isLow ? "#ff444430" : "#1a1a1a"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: catColor + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={14} color={catColor} />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{p.name}</p>
                      {p.description && <p style={{ fontSize: "10px", color: "#444", margin: "1px 0 0", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "200px" }}>{p.description}</p>}
                    </div>
                  </div>

                  {p.stock_categories ? (
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px", background: catColor + "18", color: catColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.stock_categories.name}
                    </span>
                  ) : <span />}

                  <span style={{ fontSize: "11px", color: "#444", fontFamily: "monospace" }}>{p.sku ?? "—"}</span>
                  <span style={{ fontSize: "12px", color: "#555" }}>{fmt(p.price_cost)}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f0" }}>{fmt(p.price_sale)}</span>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {isLow && <AlertTriangle size={11} color="#ff4444" />}
                    <span style={{ fontSize: "13px", fontWeight: 700, color: isLow ? "#ff4444" : "#f0f0f0" }}>
                      {p.stock_current} <span style={{ fontSize: "9px", fontWeight: 400, color: "#444" }}>{p.unit}</span>
                    </span>
                    {isLow && <span style={{ fontSize: "9px", color: "#ff444488" }}>mín {p.stock_min}</span>}
                  </div>

                  <span style={{ fontSize: "11px", color: "#444", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {p.suppliers?.name ?? "—"}
                  </span>

                  <ChevronRight size={13} color="#333" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal producto */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "24px", width: "600px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#f0f0f0" }}>
                {selected ? selected.name : "Nuevo producto"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selected && (
                  <button onClick={() => { setShowMovModal(true); }}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "7px", background: "#0d0d0d", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                    <SlidersHorizontal size={11} /> Movimiento
                  </button>
                )}
                <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "2px", gap: "2px" }}>
              {([["info", "Información", Package], ["movimientos", "Movimientos", History]] as const).map(([val, label, Icon]) => (
                <button key={val} onClick={() => setActiveTab(val)} disabled={val === "movimientos" && !selected}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", borderRadius: "6px", border: "none", cursor: val === "movimientos" && !selected ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: 600, background: activeTab === val ? "#1e1e1e" : "transparent", color: activeTab === val ? "#f0f0f0" : "#444", opacity: val === "movimientos" && !selected ? 0.4 : 1 }}>
                  <Icon size={11} />{label}
                </button>
              ))}
            </div>

            {/* Tab info */}
            {activeTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Nombre *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Nombre del producto" />
                  </div>
                  <div>
                    <label style={labelStyle}>SKU</label>
                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={inputStyle} placeholder="ABC-001" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none", width: "100%", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}><Tag size={10} style={{ display: "inline", marginRight: "4px" }} />Categoría</label>
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                      <option value="">Sin categoría</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}><Truck size={10} style={{ display: "inline", marginRight: "4px" }} />Proveedor</label>
                    <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} style={inputStyle}>
                      <option value="">Sin proveedor</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Unidad</label>
                    <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle} placeholder="unidad" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Precio costo</label>
                    <input type="number" value={form.price_cost} min={0} onChange={(e) => setForm({ ...form, price_cost: Number(e.target.value) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Precio venta</label>
                    <input type="number" value={form.price_sale} min={0} onChange={(e) => setForm({ ...form, price_sale: Number(e.target.value) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stock actual</label>
                    <input type="number" value={form.stock_current} min={0} onChange={(e) => setForm({ ...form, stock_current: Number(e.target.value) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stock mínimo <span style={{ color: "#ff4444" }}>⚠</span></label>
                    <input type="number" value={form.stock_min} min={0} onChange={(e) => setForm({ ...form, stock_min: Number(e.target.value) })} style={inputStyle} />
                  </div>
                </div>

                {/* Margen */}
                {form.price_cost > 0 && form.price_sale > 0 && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#555" }}>Margen bruto</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: form.price_sale > form.price_cost ? "#22c55e" : "#ff4444" }}>
                      {(((form.price_sale - form.price_cost) / form.price_cost) * 100).toFixed(1)}% · {fmt(form.price_sale - form.price_cost)} por unidad
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tab movimientos */}
            {activeTab === "movimientos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#555" }}>Últimos 50 movimientos</span>
                  <button onClick={() => setShowMovModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "7px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
                    <Plus size={11} /> Registrar
                  </button>
                </div>
                {movements.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#444", textAlign: "center", padding: "24px 0" }}>Sin movimientos registrados</p>
                ) : movements.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: MOV_COLORS[m.type] + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.type === "in" && <ArrowDownCircle size={14} color={MOV_COLORS[m.type]} />}
                      {m.type === "out" && <ArrowUpCircle size={14} color={MOV_COLORS[m.type]} />}
                      {m.type === "adjust" && <SlidersHorizontal size={14} color={MOV_COLORS[m.type]} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: MOV_COLORS[m.type] }}>{MOV_LABELS[m.type]}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0" }}>
                          {m.type === "in" ? "+" : m.type === "out" ? "-" : ""}{m.quantity}
                        </span>
                        {m.reason && <span style={{ fontSize: "10px", color: "#444" }}>— {m.reason}</span>}
                      </div>
                      <span style={{ fontSize: "10px", color: "#333" }}>
                        {m.stock_before} → {m.stock_after} · {new Date(m.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid #1a1a1a" }}>
              <div>
                {selected && activeTab === "info" && (
                  <button onClick={deleteProduct} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #ff444440", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#ff4444" }}>
                    Eliminar
                  </button>
                )}
              </div>
              {activeTab === "info" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                    Cancelar
                  </button>
                  <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: "0 18px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
                    {saving ? "Guardando..." : selected ? "Guardar" : "Crear"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal movimiento */}
      {showMovModal && selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "24px", width: "360px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0" }}>Registrar movimiento</span>
              <button onClick={() => setShowMovModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#444" }}><X size={14} /></button>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#555" }}>{selected.name}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0" }}>Stock actual: {selected.stock_current}</span>
            </div>

            {/* Tipo */}
            <div style={{ display: "flex", gap: "6px" }}>
              {([["in", "Entrada", "#22c55e"], ["out", "Salida", "#ff4444"], ["adjust", "Ajuste", "#ff9500"]] as const).map(([val, label, color]) => (
                <button key={val} onClick={() => setMovForm({ ...movForm, type: val })}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${movForm.type === val ? color : "#1e1e1e"}`, background: movForm.type === val ? color + "18" : "transparent", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: movForm.type === val ? color : "#555" }}>
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label style={labelStyle}>{movForm.type === "adjust" ? "Stock nuevo (absoluto)" : "Cantidad"}</label>
              <input type="number" value={movForm.quantity} min={0} onChange={(e) => setMovForm({ ...movForm, quantity: Number(e.target.value) })} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Motivo (opcional)</label>
              <input value={movForm.reason} onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })} placeholder="Ej: Compra a proveedor, Venta, Corrección..." style={inputStyle} />
            </div>

            {/* Preview */}
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#0d0d0d", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#555" }}>Stock resultante</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--accent)" }}>
                {movForm.type === "in" ? selected.stock_current + movForm.quantity
                  : movForm.type === "out" ? Math.max(0, selected.stock_current - movForm.quantity)
                  : movForm.quantity}
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowMovModal(false)} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e1e", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#555" }}>
                Cancelar
              </button>
              <button onClick={saveMovement} disabled={savingMov || movForm.quantity <= 0}
                style={{ padding: "0 18px", height: "34px", borderRadius: "8px", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: savingMov || movForm.quantity <= 0 ? 0.6 : 1 }}>
                {savingMov ? "..." : "Registrar"}
              </button>
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