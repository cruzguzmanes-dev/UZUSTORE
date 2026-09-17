import { useState, useMemo, Fragment } from "react";
import { fmt, sb } from "../utils";
import Loader from "../components/Loader";

const inp = { background: "#0a0a0f", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", width: "100%", boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" };
const thS = { padding: "12px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };
const errBox = (msg) => msg ? (
  <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "7px 12px", color: "#ff8080", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
    ⚠ {msg}
  </div>
) : null;

// ─── Modal: Dar de alta un producto nuevo ──────────────────────────────────────
function ModalAltaDirecta({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: "", sku: "", precio: "", cantidad: "", fecha: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const { nombre, sku, precio, cantidad, fecha } = form;
    if (!nombre.trim() || !sku.trim() || !precio || !cantidad) { setError("Completa todos los campos"); return; }
    const p = parseFloat(precio), c = parseInt(cantidad);
    if (isNaN(p) || p <= 0 || isNaN(c) || c <= 0) { setError("Precio y cantidad deben ser positivos"); return; }
    setSaving(true); setError("");
    try {
      await sb("lotes", "POST", {
        titulo: nombre.trim(),
        sku: sku.trim(),
        costo_unitario: p,
        cantidad_inicial: c,
        cantidad_disponible: c,
        fecha_compra: fecha,
      });
      onSaved(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>➕ Dar de Alta Producto</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 16, lineHeight: 1.5 }}>
          Para piezas que no compraste vía Japón/ZenMarket — captura lo mínimo y ya queda disponible para vender.
        </div>
        <label style={lbl}>Nombre</label>
        <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Rem Re:Zero 1/7" style={{ ...inp, marginBottom: 14 }} autoFocus />
        <label style={lbl}>SKU de Mercado Libre</label>
        <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
          placeholder="MLM123456789" style={{ ...inp, marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Precio (costo) $</label>
            <input type="number" min="0.01" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="450.00" style={inp} />
          </div>
          <div>
            <label style={lbl}>Cantidad</label>
            <input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="1" style={inp} />
          </div>
        </div>
        <label style={lbl}>Fecha</label>
        <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={{ ...inp, marginBottom: 20 }} />
        {errBox(error)}
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
          {saving ? "Guardando..." : "Dar de Alta →"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal: Agregar lote a un producto que ya existe ───────────────────────────
function ModalAgregarExistente({ producto, onClose, onSaved }) {
  const [form, setForm] = useState({ precio: "", cantidad: "", fecha: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const { precio, cantidad, fecha } = form;
    if (!precio || !cantidad) { setError("Completa precio y cantidad"); return; }
    const p = parseFloat(precio), c = parseInt(cantidad);
    if (isNaN(p) || p <= 0 || isNaN(c) || c <= 0) { setError("Precio y cantidad deben ser positivos"); return; }
    setSaving(true); setError("");
    try {
      await sb("lotes", "POST", {
        titulo: producto.titulo,
        sku: producto.sku,
        costo_unitario: p,
        cantidad_inicial: c,
        cantidad_disponible: c,
        fecha_compra: fecha,
      });
      onSaved(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>➕ Agregar Lote</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: "#FFE000", fontWeight: 700, marginBottom: 4 }}>{producto.titulo}</div>
        <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 20 }}>
          SKU {producto.sku} · ya tiene {producto.lotes.length} lote{producto.lotes.length !== 1 ? "s" : ""} registrado{producto.lotes.length !== 1 ? "s" : ""}
        </div>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 16, lineHeight: 1.5 }}>
          Este lote se suma al historial del producto sin tocar los anteriores — útil cuando resurtes a otro precio (otro proveedor, otra fecha).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Precio (costo) $</label>
            <input type="number" min="0.01" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="420.00" style={inp} autoFocus />
          </div>
          <div>
            <label style={lbl}>Cantidad</label>
            <input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="5" style={inp} />
          </div>
        </div>
        <label style={lbl}>Fecha</label>
        <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={{ ...inp, marginBottom: 20 }} />
        {errBox(error)}
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
          {saving ? "Guardando..." : "Agregar Lote →"}
        </button>
      </div>
    </div>
  );
}

export default function Inventario2({ lotes, loadingLotes, onLoteEdited }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [showAlta, setShowAlta] = useState(false);
  const [agregarA, setAgregarA] = useState(null); // producto al que se le va a agregar un lote
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

  // Agrupa los lotes (uno por cada vez que se compró/dio de alta) por SKU --
  // así un producto resurtido varias veces a distinto precio se ve como UN
  // producto con su historial adentro, en vez de N filas sueltas.
  const productos = useMemo(() => {
    const map = new Map();
    for (const l of lotes) {
      if (!map.has(l.sku)) map.set(l.sku, { sku: l.sku, titulo: l.titulo, lotes: [] });
      map.get(l.sku).lotes.push(l);
    }
    return [...map.values()].map(g => {
      const lotesOrdenados = [...g.lotes].sort((a, b) =>
        (a.fecha_compra || "").localeCompare(b.fecha_compra || "") || (a.id - b.id)
      ); // orden FIFO: el más viejo primero
      const disponible = lotesOrdenados.reduce((s, l) => s + l.cantidad_disponible, 0);
      const inicial = lotesOrdenados.reduce((s, l) => s + l.cantidad_inicial, 0);
      const costos = lotesOrdenados.map(l => parseFloat(l.costo_unitario));
      return {
        ...g,
        lotes: lotesOrdenados,
        disponible, inicial,
        costoMin: Math.min(...costos),
        costoMax: Math.max(...costos),
      };
    }).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [lotes]);

  const filtrados = productos.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.titulo.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const toggleExpand = (sku) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });
  };

  const startEdit = (id, field, currentValue) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { setEditingCell(null); return; }
    try {
      await sb(`lotes?id=eq.${id}`, "PATCH", { [field]: Math.floor(val) });
      onLoteEdited?.();
    } catch (e) { console.error(e); }
    finally { setEditingCell(null); }
  };

  const saveEditCosto = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { setEditingCell(null); return; }
    try {
      await sb(`lotes?id=eq.${id}`, "PATCH", { [field]: val });
      onLoteEdited?.();
    } catch (e) { console.error(e); }
    finally { setEditingCell(null); }
  };

  const inpInline = { background: "#0a0a0f", border: "1px solid #FFE000", borderRadius: 6, padding: "4px 8px", color: "#FFE000", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", width: 70, textAlign: "center" };

  return (
    <div>
      {showAlta && <ModalAltaDirecta onClose={() => setShowAlta(false)} onSaved={onLoteEdited} />}
      {agregarA && <ModalAgregarExistente producto={agregarA} onClose={() => setAgregarA(null)} onSaved={onLoteEdited} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
          Inventario 2.0 · {productos.length} producto{productos.length !== 1 ? "s" : ""} · Método FIFO
        </div>
        <button onClick={() => setShowAlta(true)}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          + Dar de Alta
        </button>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o SKU..."
        style={{ ...inp, marginBottom: 20 }} />

      {loadingLotes ? (
        <Loader size={120} message="Cargando inventario" />
      ) : productos.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 14, color: "#888", fontFamily: "'Space Mono', monospace" }}>No hay productos registrados</div>
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          Sin resultados para "{search}"
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["", "Producto", "SKU", "Disponible", "Costo", "Estado", ""].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const isExp = expanded.has(p.sku);
                const agotado = p.disponible === 0;
                const pocas = p.disponible > 0 && p.disponible <= 2;
                return (
                  <Fragment key={p.sku}>
                    <tr
                      style={{ borderBottom: isExp ? "none" : (i < filtrados.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"), opacity: agotado ? 0.5 : 1, cursor: "pointer" }}
                      onClick={() => toggleExpand(p.sku)}>
                      <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", color: "#555", fontSize: 12 }}>{isExp ? "▾" : "▸"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>
                        {p.titulo}
                        {p.lotes.length > 1 && (
                          <span style={{ marginLeft: 8, fontSize: 9, fontFamily: "'Space Mono', monospace", padding: "2px 7px", borderRadius: 20, background: "rgba(0,201,255,0.1)", color: "#00C9FF", letterSpacing: 1 }}>
                            {p.lotes.length} LOTES
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{p.sku}</td>
                      <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, textAlign: "center", color: agotado ? "#555" : pocas ? "#FFE000" : "#00FF94" }}>
                        {p.disponible} / {p.inicial}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#aaa" }}>
                        {p.costoMin === p.costoMax ? fmt(p.costoMin) : `${fmt(p.costoMin)} – ${fmt(p.costoMax)}`}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "3px 10px", borderRadius: 20, background: agotado ? "rgba(255,255,255,0.05)" : pocas ? "rgba(255,224,0,0.1)" : "rgba(0,255,148,0.1)", color: agotado ? "#555" : pocas ? "#FFE000" : "#00FF94" }}>
                          {agotado ? "AGOTADO" : pocas ? "POCAS" : "OK"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setAgregarA(p)}
                          style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", color: "#888", fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
                          + Agregar lote
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ borderBottom: i < filtrados.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <td colSpan={7} style={{ padding: "0 16px 16px 40px", background: "rgba(0,0,0,0.2)" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                            <thead>
                              <tr>
                                {["Fecha", "Costo Unit.", "Inicial", "Disponible", "Vendidos", "Estado"].map(h => (
                                  <th key={h} style={{ ...thS, padding: "8px 12px", fontSize: 9 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {p.lotes.map(l => {
                                const vendidos = l.cantidad_inicial - l.cantidad_disponible;
                                const lAgotado = l.cantidad_disponible === 0;
                                const lPocas = l.cantidad_disponible > 0 && l.cantidad_disponible <= 2;
                                return (
                                  <tr key={l.id} style={{ opacity: lAgotado ? 0.5 : 1 }}>
                                    <td style={{ padding: "8px 12px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#aaa" }}>{l.fecha_compra}</td>
                                    <td style={{ padding: "8px 12px" }}>
                                      {editingCell?.id === l.id && editingCell?.field === "costo_unitario" ? (
                                        <input type="number" step="0.01" min="0" value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onBlur={saveEditCosto}
                                          onKeyDown={e => { if (e.key === "Enter") saveEditCosto(); if (e.key === "Escape") setEditingCell(null); }}
                                          autoFocus style={inpInline} />
                                      ) : (
                                        <span onClick={() => startEdit(l.id, "costo_unitario", l.costo_unitario)}
                                          title="Click para editar"
                                          style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#FFE000", cursor: "pointer" }}>
                                          {fmt(l.costo_unitario)} ✎
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: "8px 12px", fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#fff", textAlign: "center" }}>{l.cantidad_inicial}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                      {editingCell?.id === l.id && editingCell?.field === "cantidad_disponible" ? (
                                        <input type="number" min="0" value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onBlur={saveEdit}
                                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCell(null); }}
                                          autoFocus style={inpInline} />
                                      ) : (
                                        <span onClick={() => startEdit(l.id, "cantidad_disponible", l.cantidad_disponible)}
                                          title="Click para editar"
                                          style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: lAgotado ? "#555" : lPocas ? "#FFE000" : "#00FF94", fontWeight: 700, cursor: "pointer" }}>
                                          {l.cantidad_disponible} ✎
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: "8px 12px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#aaa", textAlign: "center" }}>{vendidos}</td>
                                    <td style={{ padding: "8px 12px" }}>
                                      <span style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", padding: "2px 8px", borderRadius: 20, background: lAgotado ? "rgba(255,255,255,0.05)" : lPocas ? "rgba(255,224,0,0.1)" : "rgba(0,255,148,0.1)", color: lAgotado ? "#555" : lPocas ? "#FFE000" : "#00FF94" }}>
                                        {lAgotado ? "AGOTADO" : lPocas ? "POCAS" : "OK"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
