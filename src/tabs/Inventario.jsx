import { useState } from "react";
import { fmt, sb } from "../utils";
import Loader from "../components/Loader";

export default function Inventario({ lotes, loadingLotes, onAgregarLote, onLoteEdited }) {
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

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

  const inpInline = { background: "#0a0a0f", border: "1px solid #FFE000", borderRadius: 6, padding: "4px 8px", color: "#FFE000", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", width: 70, textAlign: "center" };

  const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };
  const tdMono = (color = "#fff") => ({ padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontSize: 13, color });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Lotes · Método FIFO</div>
        <button onClick={onAgregarLote} style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>+ Agregar Lote</button>
      </div>

      {loadingLotes ? (
        <Loader size={120} message="Cargando inventario" />
      ) : lotes.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 14, color: "#888", fontFamily: "'Space Mono', monospace" }}>No hay lotes registrados</div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["Producto", "SKU", "Fecha Compra", "Costo Unit.", "Inicial", "Disponible", "Vendidos", "Estado"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotes.map((l, i) => {
                const vendidos = l.cantidad_inicial - l.cantidad_disponible;
                const agotado = l.cantidad_disponible === 0;
                const pocas = l.cantidad_disponible > 0 && l.cantidad_disponible <= 2;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: agotado ? 0.5 : 1 }}>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#ddd" }}>{(l.titulo || "—").slice(0, 30)}...</td>
                    <td style={{ padding: "14px 16px", fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{l.sku}</td>
                    <td style={tdMono("#aaa")}>{l.fecha_compra}</td>
                    {/* Costo unitario — editable */}
                    <td style={{ padding: "12px 16px" }}>
                      {editingCell?.id === l.id && editingCell?.field === "costo_unitario" ? (
                        <input type="number" step="0.01" min="0" value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCell(null); }}
                          autoFocus style={inpInline} />
                      ) : (
                        <span onClick={() => startEdit(l.id, "costo_unitario", l.costo_unitario)}
                          title="Click para editar"
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#FFE000", cursor: "pointer" }}>
                          {fmt(l.costo_unitario)} ✎
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdMono(), textAlign: "center" }}>{l.cantidad_inicial}</td>
                    {/* Disponible — editable */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {editingCell?.id === l.id && editingCell?.field === "cantidad_disponible" ? (
                        <input type="number" min="0" value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCell(null); }}
                          autoFocus style={inpInline} />
                      ) : (
                        <span onClick={() => startEdit(l.id, "cantidad_disponible", l.cantidad_disponible)}
                          title="Click para editar"
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: agotado ? "#555" : pocas ? "#FFE000" : "#00FF94", fontWeight: 700, cursor: "pointer" }}>
                          {l.cantidad_disponible} ✎
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdMono("#aaa"), textAlign: "center" }}>{vendidos}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "3px 10px", borderRadius: 20, background: agotado ? "rgba(255,255,255,0.05)" : pocas ? "rgba(255,224,0,0.1)" : "rgba(0,255,148,0.1)", color: agotado ? "#555" : pocas ? "#FFE000" : "#00FF94" }}>
                        {agotado ? "AGOTADO" : pocas ? "POCAS" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
