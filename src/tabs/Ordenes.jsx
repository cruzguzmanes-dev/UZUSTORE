import { useState, useEffect, useRef } from "react";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { fmt, sb } from "../utils";
import { PER_PAGE, MESES } from "../constants";

function ModalCostoOrden({ orden, onClose, onSaved }) {
  const orderId = String(orden.orderId || orden.id);
  const qty = orden.qty || 1;
  const esEdicion = orden.costoUnit != null;

  const [costoUnit, setCostoUnit] = useState(esEdicion ? String(orden.costoUnit) : "");
  const [notas, setNotas] = useState(orden.costoNotas || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unit = parseFloat(costoUnit);
  const total = unit > 0 ? unit * qty : 0;

  const handleSave = async () => {
    if (!unit || unit <= 0) { setError("Ingresa un costo unitario válido"); return; }
    setLoading(true); setError("");
    try {
      // Upsert: borra el costo previo si existía y reinserta
      await sb(`costos_orden?order_id=eq.${orderId}`, "DELETE");
      const resp = await sb("costos_orden", "POST", {
        order_id: orderId,
        costo_unitario: unit,
        cantidad: qty,
        notas: notas.trim() || null,
      });
      const saved = Array.isArray(resp) ? resp[0] : resp;
      onSaved(saved);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              {esEdicion ? "✎ Editar costo" : "💰 Agregar costo"}
            </div>
            <div style={{ fontSize: 11, color: "#888", fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>{orden.title}</div>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
              Orden #{orderId} · {qty} u
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ background: "rgba(0,201,255,0.05)", border: "1px solid rgba(0,201,255,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", lineHeight: 1.5 }}>
          El costo se guarda directamente ligado al <span style={{ color: "#00C9FF" }}>order_id</span> en la tabla <span style={{ color: "#00C9FF" }}>costos_orden</span>. No depende de lotes ni del SKU.
        </div>

        <label style={lbl}>Costo unitario $</label>
        <input type="number" step="0.01" value={costoUnit} onChange={e => setCostoUnit(e.target.value)} placeholder="Ej: 399.00" style={{ ...inp, marginBottom: 12 }} autoFocus />

        {unit > 0 && (
          <div style={{ background: "rgba(255,224,0,0.05)", border: "1px solid rgba(255,224,0,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888", display: "flex", justifyContent: "space-between" }}>
            <span>Total ({qty} u × {fmt(unit)})</span>
            <span style={{ color: "#FFE000", fontWeight: 700 }}>{fmt(total)}</span>
          </div>
        )}

        <label style={lbl}>Notas (opcional)</label>
        <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: lote marzo, proveedor X..." style={{ ...inp, marginBottom: 16 }} />

        {error && <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "8px 12px", color: "#ff8080", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>⚠ {error}</div>}

        <button onClick={handleSave} disabled={loading}
          style={{ width: "100%", background: loading ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {loading ? "Guardando..." : esEdicion ? "Actualizar costo →" : "Guardar costo →"}
        </button>
      </div>
    </div>
  );
}

export default function Ordenes({ ordersWithFIFO, orders, onLoteAdded, onCostoSaved, enrichedMonths = new Set(), enrichMonth, enrichingMonth }) {
  const [page, setPage] = useState(1);
  const [mesSeleccionado, setMesSeleccionado] = useState("todos");
  const [ordenParaCosto, setOrdenParaCosto] = useState(null);
  const [empaques, setEmpaques] = useState([]);
  // { [order_id]: empaque_id }
  const [cajasPorOrden, setCajasPorOrden] = useState({});
  const [savingCaja, setSavingCaja] = useState(null);
  const [editandoCaja, setEditandoCaja] = useState(null);
  const [snackbar, setSnackbar] = useState(null); // { lote } | null
  const loadedRef = useRef(false);
  const snackTimerRef = useRef(null);

  const showSnackbar = (lote) => {
    setSnackbar({ lote });
    if (snackTimerRef.current) clearTimeout(snackTimerRef.current);
    snackTimerRef.current = setTimeout(() => setSnackbar(null), 5000);
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    sb("empaques?order=created_at.asc").then(data => setEmpaques(data || [])).catch(() => {});
    sb("orden_empaque").then(data => {
      if (!data) return;
      const map = {};
      data.forEach(r => { map[r.order_id] = r.empaque_id; });
      setCajasPorOrden(map);
    }).catch(() => {});
  }, []);

  // Auto-enriquecer cuando el usuario selecciona un mes específico
  useEffect(() => {
    if (mesSeleccionado === "todos") return;
    if (!enrichMonth) return;
    if (enrichedMonths.has(mesSeleccionado)) return;
    if (enrichingMonth === mesSeleccionado) return;
    enrichMonth(mesSeleccionado);
  }, [mesSeleccionado, enrichedMonths, enrichingMonth, enrichMonth]);

  const handleCajaChange = async (orderId, empaqueId) => {
    setSavingCaja(orderId);
    try {
      if (!empaqueId) {
        // Quitar caja
        await sb(`orden_empaque?order_id=eq.${orderId}`, "DELETE");
        setCajasPorOrden(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      } else {
        // Upsert via DELETE + INSERT (Supabase REST no soporta ON CONFLICT en todos los casos)
        await sb(`orden_empaque?order_id=eq.${orderId}`, "DELETE");
        await sb("orden_empaque", "POST", { order_id: orderId, empaque_id: parseInt(empaqueId) });
        setCajasPorOrden(prev => ({ ...prev, [orderId]: parseInt(empaqueId) }));
      }
    } catch (e) { console.error(e); }
    finally { setSavingCaja(null); }
  };

  const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };
  const tdMono = (color = "#fff") => ({ padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontSize: 13, color });

  const mesesDisponibles = [...new Map(
    ordersWithFIFO.map(o => {
      const [year, month] = o.date.split("-");
      return [`${year}-${month}`, { key: `${year}-${month}`, year, month: parseInt(month) }];
    })
  ).values()].sort((a, b) => b.key.localeCompare(a.key));

  const ordenesFiltradas = mesSeleccionado === "todos"
    ? ordersWithFIFO
    : ordersWithFIFO.filter(o => o.date?.slice(0, 7) === mesSeleccionado);

  const totalPages = Math.ceil(ordenesFiltradas.length / PER_PAGE);
  const ordenesPagina = ordenesFiltradas.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const devoluciones = orders.filter(o => o.status === "cancelled" || o.salePrice < 0).length;
  const sinCosto = ordenesFiltradas.filter(o => o.costo === null).length;

  // Métricas del mes seleccionado
  const utilidadTotal = mesSeleccionado !== "todos"
    ? ordenesFiltradas.reduce((sum, o) => {
        if (o.netoML == null || o.costo == null) return sum;
        const ivaSAT = (o.salePrice / 1.16) * 0.08;
        const realId = String(o.orderId || o.id);
        const cajaId = cajasPorOrden[realId];
        const caja = cajaId ? empaques.find(e => e.id === cajaId) : null;
        const cajaCosto = caja ? caja.precio : 0;
        return sum + (o.netoML - ivaSAT - o.costo - cajaCosto);
      }, 0)
    : null;
  const deudaSAT = mesSeleccionado !== "todos"
    ? ordenesFiltradas.reduce((sum, o) => sum + (o.salePrice / 1.16) * 0.08, 0)
    : null;
  const ordenesConUtilidad = mesSeleccionado !== "todos"
    ? ordenesFiltradas.filter(o => o.netoML != null && o.costo != null).length
    : 0;

  const btnPage = (disabled, children, onClick) => (
    <button onClick={onClick} disabled={disabled} style={{ background: "transparent", border: "1px solid #222", borderRadius: 6, padding: "6px 12px", color: disabled ? "#333" : "#888", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: disabled ? "default" : "pointer" }}>
      {children}
    </button>
  );

  return (
    <div>
      {ordenParaCosto && (
        <ModalCostoOrden
          orden={ordenParaCosto}
          onClose={() => setOrdenParaCosto(null)}
          onSaved={(saved) => { onCostoSaved?.(); setOrdenParaCosto(null); if (saved) showSnackbar(saved); }}
        />
      )}

      {snackbar?.lote && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          background: "#0d1117", border: "1px solid rgba(0,255,148,0.35)",
          borderRadius: 12, padding: "14px 18px",
          minWidth: 280, maxWidth: 380,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(0,255,148,0.08)",
          animation: "snackIn 0.25s ease",
        }}>
          <style>{`@keyframes snackIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#00FF94", fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>
                ✓ Costo guardado en Supabase
              </div>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", lineHeight: 1.6 }}>
                <div>BD ID: <span style={{ color: "#00C9FF" }}>#{snackbar.lote.id}</span></div>
                <div>Orden: <span style={{ color: "#FFE000" }}>{snackbar.lote.order_id}</span></div>
                <div>{snackbar.lote.cantidad || 1} u × {fmt(snackbar.lote.costo_unitario)}</div>
              </div>
            </div>
            <button onClick={() => setSnackbar(null)}
              style={{ background: "none", border: "none", color: "#555", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Órdenes Pagadas" value={ordersWithFIFO.length} accent="linear-gradient(90deg,#00FF94,#00C9FF)" icon="✅" />
        <StatCard label="Con costo FIFO" value={ordersWithFIFO.length - ordersWithFIFO.filter(o => o.costo === null).length} accent="linear-gradient(90deg,#00FF94,#92FE9D)" icon="📦" />
        <StatCard label="Sin costo" value={ordersWithFIFO.filter(o => o.costo === null).length} sub="Requieren lote" accent="linear-gradient(90deg,#FFE000,#FF9500)" icon="⚠️" />
        <StatCard label="Devoluciones" value={devoluciones} accent="linear-gradient(90deg,#FF5050,#FF0080)" icon="↩️" />
      </div>

      {sinCosto > 0 && (
        <div style={{ background: "rgba(255,224,0,0.05)", border: "1px solid rgba(255,224,0,0.2)", borderRadius: 10, padding: "12px 20px", marginBottom: 16, fontSize: 12, color: "#888", fontFamily: "'Space Mono', monospace" }}>
          ⚠ <span style={{ color: "#FFE000" }}>{sinCosto} órdenes</span> en este filtro no tienen costo asignado — haz click en <span style={{ color: "#FFE000" }}>+ Costo</span> para agregarlos
        </div>
      )}

      {mesSeleccionado !== "todos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Órdenes del mes */}
          <div style={{ background: "rgba(0,201,255,0.06)", border: "1px solid rgba(0,201,255,0.2)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Órdenes del mes</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#00C9FF", fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>
              {ordenesFiltradas.length}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#444", marginTop: 4 }}>
              {ordenesConUtilidad} con datos completos
              {ordenesFiltradas.length - ordenesConUtilidad > 0 && <span style={{ color: "#FFE000" }}> · {ordenesFiltradas.length - ordenesConUtilidad} pendientes</span>}
            </div>
          </div>

          {/* Utilidad neta */}
          <div style={{ background: utilidadTotal != null && utilidadTotal >= 0 ? "rgba(0,255,148,0.06)" : "rgba(255,80,80,0.06)", border: `1px solid ${utilidadTotal != null && utilidadTotal >= 0 ? "rgba(0,255,148,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Utilidad neta</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: utilidadTotal != null && utilidadTotal >= 0 ? "#00FF94" : "#FF5050", fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>
              {utilidadTotal != null
                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(utilidadTotal)
                : "—"}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#444", marginTop: 4 }}>
              después de comisiones, envío, costo, IVA
            </div>
          </div>

          {/* Deuda SAT */}
          <div style={{ background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>IVA pendiente SAT</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#FF5050", fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>
              {deudaSAT != null
                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(deudaSAT)
                : "—"}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#444", marginTop: 4 }}>
              8% sobre base · {ordenesFiltradas.length} órdenes
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Filtrar por mes:</div>
          <select value={mesSeleccionado} onChange={e => { setMesSeleccionado(e.target.value); setPage(1); }}
            style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 14px", color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: 12, outline: "none", cursor: "pointer" }}>
            <option value="todos">Todos los meses</option>
            {mesesDisponibles.map(m => (
              <option key={m.key} value={m.key}>{MESES[m.month - 1]} {m.year}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {mesSeleccionado !== "todos" && !enrichedMonths.has(mesSeleccionado) && (
            <button
              onClick={() => enrichMonth && enrichMonth(mesSeleccionado)}
              disabled={enrichingMonth === mesSeleccionado}
              style={{ background: enrichingMonth === mesSeleccionado ? "rgba(255,224,0,0.05)" : "rgba(255,224,0,0.1)", border: "1px solid rgba(255,224,0,0.3)", borderRadius: 8, padding: "4px 12px", color: enrichingMonth === mesSeleccionado ? "#888" : "#FFE000", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: enrichingMonth === mesSeleccionado ? "default" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
              {enrichingMonth === mesSeleccionado ? (
                <>
                  <span style={{ width: 24, display: "inline-flex" }}><Loader inline size={24} /></span>
                  Cargando datos ML...
                </>
              ) : "⬇ Cargar datos ML"}
            </button>
          )}
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555" }}>
            {ordenesFiltradas.length} órdenes · Página {page} de {totalPages || 1}
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              {["#", "Fecha", "ID Orden", "Producto", "Precio Venta", "Neto ML", "Neto SAT", "Costo FIFO", "Caja", "Utilidad", "Lote"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenesPagina.map((o, i) => {
              const num = (page - 1) * PER_PAGE + i + 1;
              const sinLote = o.costo === null;
              const realOrderId = String(o.orderId || o.id);
              const cajaId = cajasPorOrden[realOrderId];
              const cajaAsignada = cajaId ? empaques.find(e => e.id === cajaId) : null;
              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: sinLote ? "rgba(255,224,0,0.02)" : "transparent" }}>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#333", fontFamily: "'Space Mono', monospace" }}>{num}</td>
                  <td style={tdMono("#888")}>{o.date}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>{String(o.id)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#ddd", maxWidth: 240 }}>
                    <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35, wordBreak: "break-word" }}>
                      {o.title}
                    </div>
                    {o.titleExtra?.map((t, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#666", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35, wordBreak: "break-word" }}>
                        + {t}
                      </div>
                    ))}
                  </td>
                  <td style={tdMono("#FFE000")}>{fmt(o.salePrice)}</td>
                  <td style={{ padding: "12px 16px", minWidth: 170 }}>
                    {o.netoML != null ? (
                      <>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#00C9FF", fontWeight: 700 }}>{fmt(o.netoML)}</div>
                        <div style={{ fontSize: 9, color: "#888", fontFamily: "'Space Mono', monospace", marginTop: 3, lineHeight: 1.8 }}>
                          {o.saleFee > 0 && <span style={{ display: "block" }}>−{fmt(o.saleFee)} comisión</span>}
                          {o.shippingCost > 0 && <span style={{ display: "block" }}>−{fmt(o.shippingCost)} envío</span>}
                          {o.retencionIVA > 0 && <span style={{ display: "block" }}>−{fmt(o.retencionIVA)} ret. IVA</span>}
                          {o.retencionISR > 0 && <span style={{ display: "block" }}>−{fmt(o.retencionISR)} ret. ISR</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#333" }}>—</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", minWidth: 110 }}>
                    {o.netoML != null ? (
                      <>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#00FF94", fontWeight: 700 }}>
                          {(() => { const base = o.salePrice / 1.16; return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(o.netoML - base * 0.08); })()}
                        </div>
                        <div style={{ fontSize: 9, color: "#555", fontFamily: "'Space Mono', monospace", marginTop: 3 }}>
                          −{(() => { const base = o.salePrice / 1.16; return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(base * 0.08); })()} IVA SAT
                        </div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#333" }}>—</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {sinLote ? (
                      <button onClick={() => setOrdenParaCosto(o)}
                        style={{ background: "rgba(255,224,0,0.1)", border: "1px solid rgba(255,224,0,0.3)", borderRadius: 6, padding: "5px 10px", color: "#FFE000", fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
                        + Costo
                      </button>
                    ) : (
                      <button onClick={() => setOrdenParaCosto(o)} title="Editar costo"
                        style={{ background: "transparent", border: "none", padding: 0, fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#ff8080", cursor: "pointer" }}>
                        {fmt(o.costo)} <span style={{ fontSize: 10, color: "#555" }}>✎</span>
                      </button>
                    )}
                  </td>
                  {/* Caja */}
                  <td style={{ padding: "8px 12px", minWidth: 130 }}>
                    {empaques.length === 0 ? (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#333" }}>—</span>
                    ) : cajaAsignada && editandoCaja !== realOrderId ? (
                      <div
                        onClick={() => setEditandoCaja(realOrderId)}
                        title="Click para cambiar"
                        style={{ background: "rgba(0,201,255,0.08)", border: "1px solid rgba(0,201,255,0.3)", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#00C9FF", fontWeight: 700 }}>
                          {fmt(cajaAsignada.precio)}
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#4a9ab5", marginTop: 2 }}>
                          {cajaAsignada.nombre}
                        </div>
                      </div>
                    ) : (
                      <select
                        autoFocus
                        value={cajaId || ""}
                        onChange={e => { handleCajaChange(realOrderId, e.target.value); setEditandoCaja(null); }}
                        onBlur={() => setEditandoCaja(null)}
                        disabled={savingCaja === realOrderId}
                        style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 8px", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 10, outline: "none", cursor: "pointer", width: "100%" }}>
                        <option value="">Sin caja</option>
                        {empaques.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre} · {fmt(e.precio)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* Utilidad (incluye costo de caja si está asignada) */}
                  <td style={{ padding: "12px 16px" }}>
                    {sinLote ? (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#333" }}>—</span>
                    ) : (() => {
                      const base = o.salePrice / 1.16;
                      const ivaSAT = base * 0.08;
                      const netoSAT = o.netoML != null ? o.netoML - ivaSAT : null;
                      const cajaCosto = cajaAsignada ? cajaAsignada.precio : 0;
                      const utilidad = netoSAT != null ? netoSAT - o.costo - cajaCosto : null;
                      const color = utilidad == null ? "#444" : utilidad >= 0 ? "#00FF94" : "#FF5050";
                      return (
                        <div>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color, fontWeight: 700 }}>
                            {utilidad == null ? "—" : new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(utilidad)}
                          </span>
                          {cajaCosto > 0 && utilidad != null && (
                            <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: "#555", marginTop: 2 }}>
                              inc. caja
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
                    {sinLote ? <span style={{ color: "#333" }}>—</span> : (o.costoNotas || <span style={{ color: "#444" }}>manual</span>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          {btnPage(page === 1, "«", () => setPage(1))}
          {btnPage(page === 1, "‹", () => setPage(p => p - 1))}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
            .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push("..."); acc.push(n); return acc; }, [])
            .map((n, i) => n === "..." ? (
              <span key={i} style={{ color: "#333", fontFamily: "'Space Mono', monospace", fontSize: 11, padding: "0 4px" }}>...</span>
            ) : (
              <button key={i} onClick={() => setPage(n)}
                style={{ background: page === n ? "#FFE000" : "transparent", border: `1px solid ${page === n ? "#FFE000" : "#222"}`, borderRadius: 6, padding: "6px 12px", color: page === n ? "#000" : "#888", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer", fontWeight: page === n ? 700 : 400 }}>
                {n}
              </button>
            ))}
          {btnPage(page === totalPages, "›", () => setPage(p => p + 1))}
          {btnPage(page === totalPages, "»", () => setPage(totalPages))}
        </div>
      )}
    </div>
  );
}
