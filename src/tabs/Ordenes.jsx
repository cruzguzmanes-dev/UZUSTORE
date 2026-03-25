import { useState } from "react";
import StatCard from "../components/StatCard";
import { fmt, sb } from "../utils";
import { PER_PAGE, MESES } from "../constants";

function ModalCostoRapido({ orden, onClose, onSaved }) {
  const [costo, setCosto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cantNum = parseInt(cantidad) || 1;

  const handleSave = async () => {
    if (!costo) { setError("Ingresa el costo"); return; }
    if (cantNum < 1) { setError("La cantidad debe ser al menos 1"); return; }
    setLoading(true); setError("");
    try {
      await sb("lotes", "POST", {
        sku: orden.sku,
        titulo: orden.title,
        cantidad_inicial: cantNum,
        cantidad_disponible: cantNum, // FIFO descuenta al calcular, no aquí
        costo_unitario: parseFloat(costo),
        fecha_compra: fecha,
      });
      onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none" };
  const lbl = { display: "block", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>💰 Agregar costo</div>
            <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>{orden.title?.slice(0, 40)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: "rgba(255,224,0,0.05)", border: "1px solid rgba(255,224,0,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
          Crea un lote para <span style={{ color: "#FFE000" }}>{orden.sku}</span>. Pon la cantidad total que compraste en ese lote — el sistema FIFO asignará el costo a esta y futuras ventas automáticamente.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Costo unitario $</label>
            <input type="number" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Ej: 399" style={inp} autoFocus />
          </div>
          <div>
            <label style={lbl}>Cant. total del lote</label>
            <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 8" style={inp} />
          </div>
        </div>

        <label style={lbl}>Fecha de compra</label>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...inp, marginBottom: 16 }} />

        {error && <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "8px 12px", color: "#ff8080", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>⚠ {error}</div>}

        <button onClick={handleSave} disabled={loading}
          style={{ width: "100%", background: loading ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {loading ? "Guardando..." : "Guardar Lote →"}
        </button>
      </div>
    </div>
  );
}

export default function Ordenes({ ordersWithFIFO, orders, onLoteAdded, enrichedMonths = new Set(), enrichMonth, enrichingMonth, onDebug }) {
  const [page, setPage] = useState(1);
  const [mesSeleccionado, setMesSeleccionado] = useState("todos");
  const [ordenParaCosto, setOrdenParaCosto] = useState(null);

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

  // Utilidad total del mes seleccionado (solo órdenes con costo y neto ML)
  const utilidadTotal = mesSeleccionado !== "todos"
    ? ordenesFiltradas.reduce((sum, o) => {
        if (o.netoML == null || o.costo == null) return sum;
        const ivaSAT = (o.salePrice / 1.16) * 0.08;
        return sum + (o.netoML - ivaSAT - o.costo);
      }, 0)
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
        <ModalCostoRapido
          orden={ordenParaCosto}
          onClose={() => setOrdenParaCosto(null)}
          onSaved={() => { onLoteAdded(); setOrdenParaCosto(null); }}
        />
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

      {mesSeleccionado !== "todos" && utilidadTotal !== null && (
        <div style={{ background: utilidadTotal >= 0 ? "rgba(0,255,148,0.06)" : "rgba(255,80,80,0.06)", border: `1px solid ${utilidadTotal >= 0 ? "rgba(0,255,148,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 12, padding: "14px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Utilidad neta del mes</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: utilidadTotal >= 0 ? "#00FF94" : "#FF5050", fontFamily: "'Syne', sans-serif", letterSpacing: -1 }}>
              {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(utilidadTotal)}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#444", marginTop: 4 }}>
              {ordenesConUtilidad} de {ordenesFiltradas.length} órdenes con datos completos
              {ordenesFiltradas.length - ordenesConUtilidad > 0 && <span style={{ color: "#FFE000" }}> · {ordenesFiltradas.length - ordenesConUtilidad} pendientes</span>}
            </div>
          </div>
          <div style={{ fontSize: 32 }}>{utilidadTotal >= 0 ? "📈" : "📉"}</div>
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
              style={{ background: enrichingMonth === mesSeleccionado ? "rgba(255,224,0,0.05)" : "rgba(255,224,0,0.1)", border: "1px solid rgba(255,224,0,0.3)", borderRadius: 8, padding: "6px 14px", color: enrichingMonth === mesSeleccionado ? "#888" : "#FFE000", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: enrichingMonth === mesSeleccionado ? "default" : "pointer", whiteSpace: "nowrap" }}>
              {enrichingMonth === mesSeleccionado ? "⏳ Cargando datos ML..." : "⬇ Cargar datos ML"}
            </button>
          )}
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555" }}>
            {ordenesFiltradas.length} órdenes · Página {page} de {totalPages || 1}
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              {["#", "Fecha", "ID Orden", "Producto", "Precio Venta", "Neto ML", "Neto SAT", "Costo FIFO", "Utilidad", "Lote", ""].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenesPagina.map((o, i) => {
              const num = (page - 1) * PER_PAGE + i + 1;
              const sinLote = o.costo === null;
              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: sinLote ? "rgba(255,224,0,0.02)" : "transparent" }}>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#333", fontFamily: "'Space Mono', monospace" }}>{num}</td>
                  <td style={tdMono("#888")}>{o.date}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>{String(o.id)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#ddd" }}>
                    <div>{o.title?.slice(0, 32)}{o.title?.length > 32 ? "..." : ""}</div>
                    {o.titleExtra?.map((t, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#666", marginTop: 2 }}>+ {t?.slice(0, 32)}{t?.length > 32 ? "..." : ""}</div>
                    ))}
                  </td>
                  <td style={tdMono("#FFE000")}>{fmt(o.salePrice)}</td>
                  <td style={{ padding: "12px 16px", minWidth: 170 }}>
                    {o.netoML != null ? (
                      <>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#00C9FF", fontWeight: 700 }}>{fmt(o.netoML)}</div>
                        <div style={{ fontSize: 9, color: "#555", fontFamily: "'Space Mono', monospace", marginTop: 3, lineHeight: 1.8 }}>
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
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#ff8080" }}>{fmt(o.costo)}</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {sinLote ? (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#333" }}>—</span>
                    ) : (() => {
                      const base = o.salePrice / 1.16;
                      const ivaSAT = base * 0.08;
                      const netoSAT = o.netoML != null ? o.netoML - ivaSAT : null;
                      const utilidad = netoSAT != null ? netoSAT - o.costo : null;
                      const color = utilidad == null ? "#444" : utilidad >= 0 ? "#00FF94" : "#FF5050";
                      return <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color, fontWeight: 700 }}>
                        {utilidad == null ? "—" : new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(utilidad)}
                      </span>;
                    })()}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
                    {sinLote ? <span style={{ color: "#333" }}>Sin lote</span> : o.loteInfo}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {onDebug && (
                      <button onClick={() => onDebug(o.orderId || o.id)}
                        style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.2)", borderRadius: 5, padding: "3px 8px", color: "#00C9FF", fontSize: 9, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
                        🔍
                      </button>
                    )}
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
