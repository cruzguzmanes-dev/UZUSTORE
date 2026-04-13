import { useState, useEffect, useRef } from "react";
import { fmt, sb } from "../utils";

// ─── Estilos base ─────────────────────────────────────────────────────────────
const inp = {
  background: "#0a0a0f",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#fff",
  fontSize: 13,
  fontFamily: "'Space Mono', monospace",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const lbl = {
  display: "block",
  fontSize: 10,
  fontFamily: "'Space Mono', monospace",
  color: "#888",
  letterSpacing: 2,
  marginBottom: 5,
  textTransform: "uppercase",
};
const thS = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 10,
  fontFamily: "'Space Mono', monospace",
  color: "#555",
  letterSpacing: 1.5,
  textTransform: "uppercase",
};
const tdS = { padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" };

const badgeEstado = (estado) => {
  const map = {
    pendiente:   { bg: "rgba(255,224,0,0.1)",   color: "#FFE000" },
    pagado:      { bg: "rgba(0,201,255,0.1)",    color: "#00C9FF" },
    en_transito: { bg: "rgba(0,255,148,0.1)",    color: "#00FF94" },
    en_aduana:   { bg: "rgba(255,80,80,0.1)",    color: "#FF8080" },
    recibido:    { bg: "rgba(255,255,255,0.06)", color: "#aaa" },
    armando:     { bg: "rgba(255,224,0,0.1)",    color: "#FFE000" },
  };
  const s = map[estado] || { bg: "rgba(255,255,255,0.06)", color: "#aaa" };
  return {
    fontSize: 10, fontFamily: "'Space Mono', monospace",
    padding: "3px 10px", borderRadius: 20,
    background: s.bg, color: s.color,
    textTransform: "uppercase", letterSpacing: 1,
    cursor: "pointer", border: "none",
  };
};

const errBox = (msg) => msg ? (
  <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "7px 12px", color: "#ff8080", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
    ⚠ {msg}
  </div>
) : null;

// ─── Sección: Figuras ─────────────────────────────────────────────────────────
function SeccionFiguras({ onFigurasChange }) {
  const [figuras, setFiguras]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ nombre: "", ml_sku: "" });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editSku, setEditSku]   = useState("");
  const loaded = useRef(false);

  const fetchFiguras = async () => {
    try {
      const data = await sb("figuras?order=created_at.asc");
      setFiguras(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchFiguras();
  }, []);

  const genProvisional = (list) => `FIG-${String(list.length + 1).padStart(3, "0")}`;

  const handleAdd = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true); setError("");
    try {
      await sb("figuras", "POST", {
        nombre: form.nombre.trim(),
        id_provisional: genProvisional(figuras),
        ml_sku: form.ml_sku.trim() || null,
      });
      setForm({ nombre: "", ml_sku: "" });
      setShowForm(false);
      await fetchFiguras();
      onFigurasChange?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEditSku = async (id) => {
    try {
      await sb(`figuras?id=eq.${id}`, "PATCH", { ml_sku: editSku.trim() || null });
      setEditingId(null);
      await fetchFiguras();
      onFigurasChange?.();
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace" }}>
          {figuras.length} figura{figuras.length !== 1 ? "s" : ""} en catálogo
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); }}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nueva Figura"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Nombre de la figura *</label>
              <input type="text" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="Rem Re:Zero 1/7" style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>SKU MercadoLibre (opcional)</label>
              <input type="text" value={form.ml_sku}
                onChange={e => setForm(f => ({ ...f, ml_sku: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="MLB-XXXXXX" style={inp} />
            </div>
          </div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 12 }}>
            ID provisional asignado: <span style={{ color: "#FFE000" }}>{genProvisional(figuras)}</span>
          </div>
          {errBox(error)}
          <button onClick={handleAdd} disabled={saving}
            style={{ background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Guardando..." : "Guardar Figura →"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>Cargando...</div>
      ) : figuras.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          Sin figuras — agrega tu primer producto al catálogo
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["ID Prov.", "Nombre", "SKU ML", "Alta"].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {figuras.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: i < figuras.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ ...tdS, color: "#444", fontSize: 11 }}>{f.id_provisional}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{f.nombre}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {editingId === f.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="text" value={editSku}
                          onChange={e => setEditSku(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleEditSku(f.id); if (e.key === "Escape") setEditingId(null); }}
                          autoFocus style={{ ...inp, width: 150, padding: "5px 9px", fontSize: 12 }} />
                        <button onClick={() => handleEditSku(f.id)}
                          style={{ background: "#00FF94", border: "none", borderRadius: 6, padding: "4px 9px", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓</button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "4px 9px", color: "#555", fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(f.id); setEditSku(f.ml_sku || ""); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12, color: f.ml_sku ? "#00C9FF" : "#444", padding: 0 }}
                        title="Click para editar SKU">
                        {f.ml_sku || "— sin SKU"} ✎
                      </button>
                    )}
                  </td>
                  <td style={{ ...tdS, fontSize: 11, color: "#444" }}>{f.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sección: Compras ─────────────────────────────────────────────────────────
function SeccionCompras({ figuras, onFigurasChange }) {
  const [compras, setCompras]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    nombre_figura: "", cantidad: "", precio_jpy: "",
    fecha_compra: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [editingCell, setEditingCell] = useState(null);
  const [editVal, setEditVal]   = useState("");
  const loaded = useRef(false);

  const fetchCompras = async () => {
    try {
      const data = await sb("lotes_compra?order=fecha_compra.desc&select=*,figuras(nombre,id_provisional,ml_sku)");
      setCompras(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchCompras();
  }, []);

  const handleAdd = async () => {
    const { nombre_figura, cantidad, precio_jpy, fecha_compra } = form;
    if (!nombre_figura.trim() || !cantidad || !precio_jpy || !fecha_compra) { setError("Completa los campos requeridos (*)"); return; }
    const qty = parseInt(cantidad), jpy = parseFloat(precio_jpy);
    if (isNaN(qty) || qty <= 0 || isNaN(jpy) || jpy <= 0) { setError("Cantidad y precio ¥ deben ser positivos"); return; }
    setSaving(true); setError("");
    try {
      const nombre = nombre_figura.trim();
      let figuraId;
      const existing = figuras.find(f => f.nombre.toLowerCase() === nombre.toLowerCase());
      if (existing) {
        figuraId = existing.id;
      } else {
        const allFiguras = await sb("figuras?select=id&order=id.asc");
        const idProv = `FIG-${String((allFiguras?.length || 0) + 1).padStart(3, "0")}`;
        await sb("figuras", "POST", { nombre, id_provisional: idProv });
        onFigurasChange?.();
        const fresh = await sb("figuras?order=id.desc&limit=1");
        figuraId = fresh?.[0]?.id;
      }
      if (!figuraId) throw new Error("No se pudo crear la figura");
      await sb("lotes_compra", "POST", {
        figura_id: figuraId,
        cantidad: qty,
        precio_jpy: jpy,
        fecha_compra,
        estado: "pendiente",
      });
      setForm(f => ({ ...f, nombre_figura: "", cantidad: "", precio_jpy: "" }));
      setShowForm(false);
      await fetchCompras();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    try {
      if (field === "estado") {
        await sb(`lotes_compra?id=eq.${id}`, "PATCH", { estado: editVal });
      }
      await fetchCompras();
    } catch (e) { console.error(e); }
    finally { setEditingCell(null); }
  };

  const ESTADOS = ["pendiente", "pagado", "en_transito", "recibido"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace" }}>
          {compras.length} lote{compras.length !== 1 ? "s" : ""} de compra
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); }}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nueva Compra"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Nombre de la figura *</label>
              <input type="text" value={form.nombre_figura}
                onChange={e => setForm(f => ({ ...f, nombre_figura: e.target.value }))}
                placeholder="Rem Re:Zero 1/7" style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>Cantidad *</label>
              <input type="number" min="1" value={form.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                placeholder="10" style={inp} />
            </div>
            <div>
              <label style={lbl}>Precio ¥/u *</label>
              <input type="number" min="1" value={form.precio_jpy}
                onChange={e => setForm(f => ({ ...f, precio_jpy: e.target.value }))}
                placeholder="3500" style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha *</label>
              <input type="date" value={form.fecha_compra}
                onChange={e => setForm(f => ({ ...f, fecha_compra: e.target.value }))}
                style={inp} />
            </div>
          </div>
          {errBox(error)}
          <button onClick={handleAdd} disabled={saving}
            style={{ background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Guardando..." : "Guardar Compra →"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>Cargando...</div>
      ) : compras.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          Sin compras registradas
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["Figura", "Fecha", "Cant.", "Precio ¥", "Precio MXN", "Estado", "Lote Gen."].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < compras.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", opacity: c.lote_generado_id ? 0.55 : 1 }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{c.figuras?.nombre || "—"}</div>
                    <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginTop: 2 }}>{c.figuras?.id_provisional}</div>
                  </td>
                  <td style={tdS}>{c.fecha_compra}</td>
                  <td style={{ ...tdS, color: "#fff", fontWeight: 700 }}>{c.cantidad}</td>
                  <td style={{ ...tdS, color: "#aaa" }}>¥{Number(c.precio_jpy).toLocaleString()}</td>
                  {/* Precio MXN — read-only, se llena automáticamente al asignar pago */}
                  <td style={tdS}>
                    <span style={{ color: c.precio_mxn ? "#00C9FF" : "#444" }}>
                      {c.precio_mxn ? fmt(c.precio_mxn) : "— vía pago"}
                    </span>
                  </td>
                  {/* Estado — editable */}
                  <td style={{ padding: "12px 16px" }}>
                    {editingCell?.id === c.id && editingCell?.field === "estado" ? (
                      <select value={editVal} onChange={e => setEditVal(e.target.value)}
                        onBlur={saveEdit} autoFocus
                        style={{ ...inp, width: 130, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>
                        {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => { setEditingCell({ id: c.id, field: "estado" }); setEditVal(c.estado); }}
                        style={badgeEstado(c.estado)}>
                        {c.estado}
                      </button>
                    )}
                  </td>
                  <td style={{ ...tdS, fontSize: 11 }}>
                    {c.lote_generado_id
                      ? <span style={{ color: "#00FF94" }}>✓ lote #{c.lote_generado_id}</span>
                      : <span style={{ color: "#333" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sección: Paquetes ────────────────────────────────────────────────────────
function SeccionPaquetes({ onLoteEdited }) {
  const [paquetes, setPaquetes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ nombre: "", id_zenmarket: "", costo_envio_jpy: "", fecha_envio: "" });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [paqueteItems, setPaqueteItems] = useState({});
  const [comprasDisp, setComprasDisp]  = useState([]);
  const [addingItem, setAddingItem]    = useState({ paquete_id: null, lote_compra_id: "", cantidad: "" });
  const [editingCell, setEditingCell]  = useState(null);
  const [editVal, setEditVal]          = useState("");
  const [generando, setGenerando]      = useState(null);
  const [genError, setGenError]        = useState("");
  const loaded = useRef(false);

  const fetchPaquetes = async () => {
    try {
      const data = await sb("paquetes?order=created_at.desc");
      setPaquetes(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchItems = async (paqueteId) => {
    try {
      const data = await sb(`paquete_items?paquete_id=eq.${paqueteId}&select=*,lotes_compra(*,figuras(nombre,id_provisional,ml_sku))`);
      setPaqueteItems(prev => ({ ...prev, [paqueteId]: data || [] }));
    } catch (e) { console.error(e); }
  };

  const fetchComprasDisp = async () => {
    try {
      const data = await sb("lotes_compra?lote_generado_id=is.null&order=fecha_compra.desc&select=id,cantidad,fecha_compra,figuras(nombre)");
      setComprasDisp(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchPaquetes();
  }, []);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setAddingItem({ paquete_id: id, lote_compra_id: "", cantidad: "" });
    await Promise.all([fetchItems(id), fetchComprasDisp()]);
  };

  const handleAddPaquete = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true); setError("");
    try {
      await sb("paquetes", "POST", {
        nombre: form.nombre.trim(),
        id_zenmarket: form.id_zenmarket.trim() || null,
        costo_envio_jpy: form.costo_envio_jpy ? parseFloat(form.costo_envio_jpy) : null,
        estado: "armando",
        fecha_envio: form.fecha_envio || null,
      });
      setForm({ nombre: "", id_zenmarket: "", costo_envio_jpy: "", fecha_envio: "" });
      setShowForm(false);
      await fetchPaquetes();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveEdit = async (pId) => {
    if (!editingCell || editingCell.id !== pId) return;
    const { field } = editingCell;
    try {
      if (field === "estado") {
        const patch = { estado: editVal };
        if (editVal === "recibido") patch.fecha_llegada = new Date().toISOString().slice(0, 10);
        await sb(`paquetes?id=eq.${pId}`, "PATCH", patch);
      } else if (field === "costo_envio_jpy" || field === "costo_aduana_mxn") {
        const v = parseFloat(editVal);
        if (!isNaN(v) && v >= 0) await sb(`paquetes?id=eq.${pId}`, "PATCH", { [field]: v });
      }
      await fetchPaquetes();
    } catch (e) { console.error(e); }
    finally { setEditingCell(null); }
  };

  const handleAddItem = async (paqueteId) => {
    const { lote_compra_id, cantidad } = addingItem;
    if (!lote_compra_id || !cantidad) return;
    const qty = parseInt(cantidad);
    if (isNaN(qty) || qty <= 0) return;
    try {
      await sb("paquete_items", "POST", {
        paquete_id: paqueteId,
        lote_compra_id: parseInt(lote_compra_id),
        cantidad: qty,
      });
      setAddingItem({ paquete_id: paqueteId, lote_compra_id: "", cantidad: "" });
      await Promise.all([fetchItems(paqueteId), fetchComprasDisp()]);
    } catch (e) { console.error(e); }
  };

  const handleRemoveItem = async (itemId, paqueteId) => {
    try {
      await sb(`paquete_items?id=eq.${itemId}`, "DELETE");
      await Promise.all([fetchItems(paqueteId), fetchComprasDisp()]);
    } catch (e) { console.error(e); }
  };

  const handleGenerarLotes = async (paquete) => {
    setGenerando(paquete.id);
    setGenError("");
    try {
      const items = await sb(
        `paquete_items?paquete_id=eq.${paquete.id}&select=*,lotes_compra(*,figuras(nombre,id_provisional,ml_sku))`
      );
      if (!items || items.length === 0) throw new Error("No hay artículos en este paquete");

      // Obtener tipo de cambio del pago ZenMarket
      const pagos = await sb(`pagos_zenmarket?id=eq.${paquete.pago_zenmarket_id}&select=mxn_pagados,jpy_obtenidos`);
      if (!pagos || pagos.length === 0) throw new Error("No se encontró el pago ZenMarket asignado");
      const tc = parseFloat(pagos[0].mxn_pagados) / parseFloat(pagos[0].jpy_obtenidos);

      const totalPiezas    = items.reduce((s, it) => s + it.cantidad, 0);
      const envioPorPieza  = (parseFloat(paquete.costo_envio_jpy) || 0) * tc / totalPiezas;
      const aduanaPorPieza = (parseFloat(paquete.costo_aduana_mxn) || 0) / totalPiezas;

      for (const item of items) {
        const lc  = item.lotes_compra;
        const fig = lc.figuras;
        const sku = fig.ml_sku || fig.id_provisional;
        const precioMxn    = parseFloat(lc.precio_jpy) * tc;
        const costoUnitario = parseFloat((precioMxn + envioPorPieza + aduanaPorPieza).toFixed(2));

        const [newLote] = await sb("lotes", "POST", {
          titulo:              fig.nombre,
          sku:                 sku,
          cantidad_disponible: item.cantidad,
          cantidad_inicial:    item.cantidad,
          costo_unitario:      costoUnitario,
          fecha_compra:        lc.fecha_compra,
        });

        await sb(`lotes_compra?id=eq.${lc.id}`, "PATCH", {
          lote_generado_id: newLote.id,
          estado: "recibido",
        });
      }

      await sb(`paquetes?id=eq.${paquete.id}`, "PATCH", { lotes_generados: true });
      await fetchPaquetes();
      onLoteEdited?.();
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerando(null);
    }
  };

  const ESTADOS_P = ["armando", "en_transito", "en_aduana", "recibido"];

  const getComprasParaPaquete = (paqueteId) => {
    const usados = new Set((paqueteItems[paqueteId] || []).map(it => it.lote_compra_id));
    return comprasDisp.filter(c => !usados.has(c.id));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace" }}>
          {paquetes.length} paquete{paquetes.length !== 1 ? "s" : ""}
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); }}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nuevo Paquete"}
        </button>
      </div>

      {genError && errBox(genError)}

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Nombre del paquete *</label>
              <input type="text" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAddPaquete()}
                placeholder="Paquete Marzo 2025" style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>ID ZenMarket</label>
              <input type="text" value={form.id_zenmarket}
                onChange={e => setForm(f => ({ ...f, id_zenmarket: e.target.value }))}
                placeholder="207" style={inp} />
            </div>
            <div>
              <label style={lbl}>Envío ¥ (opcional)</label>
              <input type="number" min="0" value={form.costo_envio_jpy}
                onChange={e => setForm(f => ({ ...f, costo_envio_jpy: e.target.value }))}
                placeholder="8000" style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha de envío</label>
              <input type="date" value={form.fecha_envio}
                onChange={e => setForm(f => ({ ...f, fecha_envio: e.target.value }))}
                style={inp} />
            </div>
          </div>
          {errBox(error)}
          <button onClick={handleAddPaquete} disabled={saving}
            style={{ background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Guardando..." : "Crear Paquete →"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>Cargando...</div>
      ) : paquetes.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          Sin paquetes registrados
        </div>
      ) : (
        <div>
          {paquetes.map(p => {
            const canGenerate = p.estado === "recibido"
              && p.pago_zenmarket_id != null
              && p.costo_aduana_mxn != null
              && !p.lotes_generados;
            const items   = paqueteItems[p.id] || [];
            const isExp   = expanded === p.id;
            const disponibles = getComprasParaPaquete(p.id);

            return (
              <div key={p.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 8, overflow: "hidden" }}>

                {/* Fila principal */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", flexWrap: "wrap" }}>
                  <button onClick={() => toggleExpand(p.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>
                      {isExp ? "▾" : "▸"} {p.nombre}
                      {p.id_zenmarket && <span style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", marginLeft: 8 }}># {p.id_zenmarket}</span>}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginTop: 3 }}>
                      {p.fecha_envio ? `Envío: ${p.fecha_envio}` : "Sin fecha de envío"}
                      {p.fecha_llegada ? ` · Llegada: ${p.fecha_llegada}` : ""}
                    </div>
                  </button>

                  {/* Estado */}
                  {editingCell?.id === p.id && editingCell?.field === "estado" ? (
                    <select value={editVal} onChange={e => setEditVal(e.target.value)}
                      onBlur={() => saveEdit(p.id)} autoFocus
                      style={{ ...inp, width: 130, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>
                      {ESTADOS_P.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => { setEditingCell({ id: p.id, field: "estado" }); setEditVal(p.estado); }}
                      style={badgeEstado(p.estado)}>
                      {p.estado}
                    </button>
                  )}

                  {/* Envío ¥ */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 2 }}>Envío ¥</div>
                    {editingCell?.id === p.id && editingCell?.field === "costo_envio_jpy" ? (
                      <input type="number" step="1" value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => saveEdit(p.id)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(p.id); if (e.key === "Escape") setEditingCell(null); }}
                        autoFocus style={{ ...inp, width: 100, padding: "5px 8px", fontSize: 12 }} />
                    ) : (
                      <button onClick={() => { setEditingCell({ id: p.id, field: "costo_envio_jpy" }); setEditVal(p.costo_envio_jpy != null ? String(p.costo_envio_jpy) : ""); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.costo_envio_jpy != null ? "#fff" : "#444", padding: 0 }}>
                        {p.costo_envio_jpy != null ? `¥${Number(p.costo_envio_jpy).toLocaleString()}` : "— ✎"}
                      </button>
                    )}
                  </div>

                  {/* Aduana MXN */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 2 }}>Aduana</div>
                    {editingCell?.id === p.id && editingCell?.field === "costo_aduana_mxn" ? (
                      <input type="number" step="0.01" value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => saveEdit(p.id)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(p.id); if (e.key === "Escape") setEditingCell(null); }}
                        autoFocus style={{ ...inp, width: 100, padding: "5px 8px", fontSize: 12 }} />
                    ) : (
                      <button onClick={() => { setEditingCell({ id: p.id, field: "costo_aduana_mxn" }); setEditVal(p.costo_aduana_mxn != null ? String(p.costo_aduana_mxn) : ""); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.costo_aduana_mxn != null ? "#fff" : "#444", padding: 0 }}>
                        {p.costo_aduana_mxn != null ? fmt(p.costo_aduana_mxn) : "— ✎"}
                      </button>
                    )}
                  </div>

                  {/* Pago asignado */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 2 }}>Pago</div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.pago_zenmarket_id ? "#00C9FF" : "#444" }}>
                      {p.pago_zenmarket_id ? `#${p.pago_zenmarket_id}` : "Sin asignar"}
                    </span>
                  </div>

                  {p.lotes_generados && (
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "3px 10px", borderRadius: 20, background: "rgba(0,255,148,0.1)", color: "#00FF94", whiteSpace: "nowrap", letterSpacing: 1 }}>
                      ✓ LOTES OK
                    </span>
                  )}

                  {canGenerate && (
                    <button onClick={() => handleGenerarLotes(p)} disabled={generando === p.id}
                      style={{ background: generando === p.id ? "#333" : "#00FF94", border: "none", borderRadius: 8, padding: "8px 16px", color: "#000", fontSize: 11, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: generando === p.id ? "default" : "pointer", whiteSpace: "nowrap" }}>
                      {generando === p.id ? "Generando..." : "Generar Lotes →"}
                    </button>
                  )}
                </div>

                {/* Contenido expandido */}
                {isExp && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)", padding: "14px 20px" }}>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 14 }}>
                        Sin artículos — agrega compras a este paquete ↓
                      </div>
                    ) : (
                      <div style={{ marginBottom: 14 }}>
                        {items.map(it => (
                          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ flex: 1, fontSize: 13, color: "#ddd", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>
                              {it.lotes_compra?.figuras?.nombre || "—"}
                              <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginLeft: 8 }}>
                                {it.lotes_compra?.figuras?.id_provisional}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#888" }}>×{it.cantidad}</div>
                            <div style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#aaa" }}>
                              ¥{Number(it.lotes_compra?.precio_jpy).toLocaleString()}/u
                            </div>
                            {it.lotes_compra?.precio_mxn && (
                              <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#00C9FF" }}>
                                {fmt(it.lotes_compra.precio_mxn)}/u
                              </div>
                            )}
                            {!p.lotes_generados && (
                              <button onClick={() => handleRemoveItem(it.id, p.id)}
                                style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "3px 8px", color: "#555", fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!p.lotes_generados && (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>
                            Agregar compra al paquete
                          </div>
                          <select
                            value={addingItem.paquete_id === p.id ? addingItem.lote_compra_id : ""}
                            onChange={e => setAddingItem({ paquete_id: p.id, lote_compra_id: e.target.value, cantidad: "" })}
                            style={{ ...inp, width: 260, padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>
                            <option value="">Seleccionar compra...</option>
                            {disponibles.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.figuras?.nombre} — {c.cantidad}u · {c.fecha_compra}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Cant.</div>
                          <input type="number" min="1" placeholder="10"
                            value={addingItem.paquete_id === p.id ? addingItem.cantidad : ""}
                            onChange={e => setAddingItem(prev => ({ ...prev, cantidad: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddItem(p.id)}
                            style={{ ...inp, width: 80, padding: "7px 10px", fontSize: 12 }} />
                        </div>
                        <button onClick={() => handleAddItem(p.id)}
                          disabled={!addingItem.lote_compra_id || !addingItem.cantidad}
                          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "9px 16px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", opacity: (!addingItem.lote_compra_id || !addingItem.cantidad) ? 0.35 : 1 }}>
                          + Agregar
                        </button>
                      </div>
                    )}

                    {/* Vista previa de costos */}
                    {p.estado === "recibido" && p.pago_zenmarket_id && items.length > 0 && !p.lotes_generados && (
                      <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(0,255,148,0.05)", border: "1px solid rgba(0,255,148,0.15)", borderRadius: 10, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                        <div style={{ color: "#00FF94", marginBottom: 6, fontWeight: 700 }}>Vista previa de costos</div>
                        {items.map(it => (
                          <div key={it.id} style={{ color: "#888", marginBottom: 3 }}>
                            {it.lotes_compra?.figuras?.nombre}: ¥{Number(it.lotes_compra?.precio_jpy).toLocaleString()}/u
                            {it.lotes_compra?.precio_mxn && (
                              <span style={{ color: "#fff", marginLeft: 8 }}>= {fmt(it.lotes_compra.precio_mxn)}/u</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sección: Pagos ZenMarket ─────────────────────────────────────────────────
function SeccionPagos() {
  const [pagos, setPagos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    fecha: new Date().toISOString().slice(0, 10),
    mxn_pagados: "", jpy_obtenidos: "", notas: "",
  });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [expanded, setExpanded]       = useState(null);
  const [paquetesDelPago, setPaquetesDelPago] = useState({});
  const loaded = useRef(false);

  const fetchPagos = async () => {
    try {
      const data = await sb("pagos_zenmarket?order=fecha.desc");
      setPagos(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPaquetesDelPago = async (pagoId) => {
    try {
      const data = await sb(`paquetes?pago_zenmarket_id=eq.${pagoId}&select=id,nombre,id_zenmarket,estado`);
      setPaquetesDelPago(prev => ({ ...prev, [pagoId]: data || [] }));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchPagos();
  }, []);

  const handleAdd = async () => {
    const { fecha, mxn_pagados, jpy_obtenidos } = form;
    if (!fecha || !mxn_pagados || !jpy_obtenidos) { setError("Fecha, MXN y ¥ son requeridos"); return; }
    const mxn = parseFloat(mxn_pagados), jpy = parseFloat(jpy_obtenidos);
    if (isNaN(mxn) || mxn <= 0 || isNaN(jpy) || jpy <= 0) { setError("Los montos deben ser positivos"); return; }
    setSaving(true); setError("");
    try {
      // 1. Crear el pago
      const [pago] = await sb("pagos_zenmarket", "POST", {
        fecha, mxn_pagados: mxn, jpy_obtenidos: jpy,
        notas: form.notas.trim() || null,
      });
      const tc = mxn / jpy;

      // 2. Asignar automáticamente todos los paquetes pendientes
      const pendientes = await sb("paquetes?pago_zenmarket_id=is.null&lotes_generados=eq.false&select=id");
      for (const pkg of (pendientes || [])) {
        await sb(`paquetes?id=eq.${pkg.id}`, "PATCH", { pago_zenmarket_id: pago.id });
        const items = await sb(`paquete_items?paquete_id=eq.${pkg.id}&select=lote_compra_id,lotes_compra(precio_jpy)`);
        for (const item of (items || [])) {
          const precioMxn = parseFloat(item.lotes_compra?.precio_jpy) * tc;
          await sb(`lotes_compra?id=eq.${item.lote_compra_id}`, "PATCH", {
            precio_mxn: parseFloat(precioMxn.toFixed(2)),
            estado: "pagado",
          });
        }
      }

      setForm({ fecha: new Date().toISOString().slice(0, 10), mxn_pagados: "", jpy_obtenidos: "", notas: "" });
      setShowForm(false);
      await fetchPagos();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleExpandPago = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    await fetchPaquetesDelPago(id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace" }}>
          {pagos.length} pago{pagos.length !== 1 ? "s" : ""} ZenMarket
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); }}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nuevo Pago"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Fecha *</label>
              <input type="date" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                style={inp} />
            </div>
            <div>
              <label style={lbl}>MXN pagados *</label>
              <input type="number" min="0.01" step="0.01" value={form.mxn_pagados}
                onChange={e => setForm(f => ({ ...f, mxn_pagados: e.target.value }))}
                placeholder="15000.00" style={inp} />
            </div>
            <div>
              <label style={lbl}>¥ obtenidos *</label>
              <input type="number" min="1" value={form.jpy_obtenidos}
                onChange={e => setForm(f => ({ ...f, jpy_obtenidos: e.target.value }))}
                placeholder="120000" style={inp} />
            </div>
            <div>
              <label style={lbl}>Notas</label>
              <input type="text" value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Recarga abril..." style={inp} />
            </div>
          </div>
          {form.mxn_pagados && form.jpy_obtenidos && (
            <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 12 }}>
              Tipo de cambio: <span style={{ color: "#00C9FF" }}>¥1 = ${(parseFloat(form.mxn_pagados) / parseFloat(form.jpy_obtenidos)).toFixed(4)} MXN</span>
            </div>
          )}
          {errBox(error)}
          <button onClick={handleAdd} disabled={saving}
            style={{ background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Guardando..." : "Registrar Pago →"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>Cargando...</div>
      ) : pagos.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          Sin pagos registrados
        </div>
      ) : (
        <div>
          {pagos.map(pago => {
            const tc       = (parseFloat(pago.mxn_pagados) / parseFloat(pago.jpy_obtenidos)).toFixed(4);
            const isExp    = expanded === pago.id;
            const asignados = paquetesDelPago[pago.id] || [];

            return (
              <div key={pago.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 8, overflow: "hidden" }}>
                <button onClick={() => handleExpandPago(pago.id)}
                  style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 3, letterSpacing: 1 }}>FECHA</div>
                      <div style={{ fontSize: 13, color: "#fff", fontFamily: "'Space Mono', monospace" }}>{pago.fecha}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 3, letterSpacing: 1 }}>PAGADO MXN</div>
                      <div style={{ fontSize: 13, color: "#FFE000", fontFamily: "'Space Mono', monospace" }}>{fmt(pago.mxn_pagados)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 3, letterSpacing: 1 }}>CRÉDITO ¥</div>
                      <div style={{ fontSize: 13, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>¥{Number(pago.jpy_obtenidos).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 3, letterSpacing: 1 }}>T/C</div>
                      <div style={{ fontSize: 13, color: "#00C9FF", fontFamily: "'Space Mono', monospace" }}>¥1 = ${tc}</div>
                    </div>
                    {pago.notas && (
                      <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", fontStyle: "italic" }}>{pago.notas}</div>
                    )}
                    <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{isExp ? "▾" : "▸"}</div>
                  </div>
                </button>

                {isExp && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)", padding: "14px 20px" }}>
                    {asignados.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>
                        Sin paquetes asignados
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                          Paquetes cubiertos por este pago
                        </div>
                        {asignados.map(pkg => (
                          <div key={pkg.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ flex: 1, fontSize: 13, color: "#ddd", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>
                              {pkg.nombre}
                              {pkg.id_zenmarket && <span style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", marginLeft: 8 }}># {pkg.id_zenmarket}</span>}
                            </div>
                            <span style={badgeEstado(pkg.estado)}>{pkg.estado}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function InventarioCarrilB({ onLoteEdited }) {
  const [subTab, setSubTab] = useState("figuras");
  const [figuras, setFiguras] = useState([]);

  const fetchFiguras = async () => {
    try {
      const data = await sb("figuras?order=created_at.asc");
      setFiguras(data || []);
    } catch (e) { /* figuras no existe todavía → silencioso */ }
  };

  useEffect(() => { fetchFiguras(); }, []);

  const TABS = [
    { key: "figuras",  label: "Figuras"  },
    { key: "compras",  label: "Compras"  },
    { key: "paquetes", label: "Paquetes" },
    { key: "pagos",    label: "Pagos"    },
  ];

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 2.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Carril B · Compras Automáticas
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{
              flex: 1,
              background: subTab === t.key ? "rgba(255,255,255,0.09)" : "transparent",
              border: "none", borderRadius: 7,
              padding: "9px 16px",
              color: subTab === t.key ? "#fff" : "#555",
              fontSize: 11, fontFamily: "'Space Mono', monospace",
              letterSpacing: 1, textTransform: "uppercase",
              cursor: "pointer",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "figuras"  && <SeccionFiguras  onFigurasChange={fetchFiguras} />}
      {subTab === "compras"  && <SeccionCompras  figuras={figuras} onFigurasChange={fetchFiguras} />}
      {subTab === "paquetes" && <SeccionPaquetes onLoteEdited={onLoteEdited} />}
      {subTab === "pagos"    && <SeccionPagos />}
    </div>
  );
}
