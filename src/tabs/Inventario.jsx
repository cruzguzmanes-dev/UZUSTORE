import { useState, useEffect, useRef } from "react";
import { fmt, sb } from "../utils";

function SeccionEmpaques() {
  const [empaques, setEmpaques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPrecio, setEditPrecio] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ largo: "", ancho: "", alto: "", precio: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadedRef = useRef(false);

  const fetchEmpaques = async () => {
    try {
      const data = await sb("empaques?order=created_at.asc");
      setEmpaques(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchEmpaques();
  }, []);

  const handleAdd = async () => {
    const { largo, ancho, alto, precio } = form;
    if (!largo || !ancho || !alto || !precio) { setError("Completa todos los campos"); return; }
    const l = parseInt(largo), a = parseInt(ancho), h = parseInt(alto), p = parseFloat(precio);
    if (isNaN(l) || isNaN(a) || isNaN(h) || isNaN(p) || p <= 0) { setError("Valores inválidos"); return; }
    setSaving(true); setError("");
    try {
      await sb("empaques", "POST", { nombre: `${l}x${a}x${h}`, largo: l, ancho: a, alto: h, precio: p });
      setForm({ largo: "", ancho: "", alto: "", precio: "" });
      setShowForm(false);
      await fetchEmpaques();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEditPrecio = async (id) => {
    const p = parseFloat(editPrecio);
    if (isNaN(p) || p <= 0) return;
    try {
      await sb(`empaques?id=eq.${id}`, "PATCH", { precio: p });
      setEditingId(null);
      await fetchEmpaques();
    } catch (e) { console.error(e); }
  };

  const inp = { background: "#0a0a0f", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", width: "100%" };
  const lbl = { display: "block", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" };
  const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
          Empaques · Catálogo de Cajas
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); }}
          style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nueva Caja"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Largo (cm)</label>
              <input type="number" min="1" value={form.largo} onChange={e => setForm(f => ({ ...f, largo: e.target.value }))} placeholder="20" style={inp} />
            </div>
            <div>
              <label style={lbl}>Ancho (cm)</label>
              <input type="number" min="1" value={form.ancho} onChange={e => setForm(f => ({ ...f, ancho: e.target.value }))} placeholder="20" style={inp} />
            </div>
            <div>
              <label style={lbl}>Alto (cm)</label>
              <input type="number" min="1" value={form.alto} onChange={e => setForm(f => ({ ...f, alto: e.target.value }))} placeholder="15" style={inp} />
            </div>
            <div>
              <label style={lbl}>Precio ($)</label>
              <input type="number" min="0.01" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="12.50" style={inp} />
            </div>
          </div>
          {form.largo && form.ancho && form.alto && (
            <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#555", marginBottom: 12 }}>
              Nombre: <span style={{ color: "#FFE000" }}>{form.largo}x{form.ancho}x{form.alto}</span>
            </div>
          )}
          {error && (
            <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "8px 12px", color: "#ff8080", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}
          <button onClick={handleAdd} disabled={saving}
            style={{ background: saving ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Guardando..." : "Guardar Caja →"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Cargando empaques...</div>
      ) : empaques.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>Sin cajas registradas — agrega una para asignarlas a órdenes</div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["Nombre", "Largo", "Ancho", "Alto", "Volumen", "Precio"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empaques.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < empaques.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{e.nombre}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{e.largo} cm</td>
                  <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{e.ancho} cm</td>
                  <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{e.alto} cm</td>
                  <td style={{ padding: "14px 16px", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555" }}>{(e.largo * e.ancho * e.alto).toLocaleString()} cm³</td>
                  <td style={{ padding: "14px 16px" }}>
                    {editingId === e.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" step="0.01" min="0.01" value={editPrecio}
                          onChange={ev => setEditPrecio(ev.target.value)}
                          onKeyDown={ev => { if (ev.key === "Enter") handleEditPrecio(e.id); if (ev.key === "Escape") setEditingId(null); }}
                          autoFocus style={{ ...inp, width: 90, padding: "6px 10px", fontSize: 12 }} />
                        <button onClick={() => handleEditPrecio(e.id)}
                          style={{ background: "#00FF94", border: "none", borderRadius: 6, padding: "5px 10px", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓</button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", color: "#555", fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(e.id); setEditPrecio(String(e.precio)); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#FFE000", fontWeight: 700, padding: 0 }}
                        title="Editar precio">
                        {fmt(e.precio)} ✎
                      </button>
                    )}
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

export default function Inventario({ lotes, loadingLotes, onAgregarLote }) {
  const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };
  const tdMono = (color = "#fff") => ({ padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontSize: 13, color });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Lotes · Método FIFO</div>
        <button onClick={onAgregarLote} style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>+ Agregar Lote</button>
      </div>

      {loadingLotes ? (
        <div style={{ textAlign: "center", padding: 40, color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Cargando inventario...</div>
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
                    <td style={tdMono("#FFE000")}>{fmt(l.costo_unitario)}</td>
                    <td style={{ ...tdMono(), textAlign: "center" }}>{l.cantidad_inicial}</td>
                    <td style={{ ...tdMono(agotado ? "#555" : pocas ? "#FFE000" : "#00FF94"), textAlign: "center", fontWeight: 700 }}>{l.cantidad_disponible}</td>
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

      <SeccionEmpaques />
    </div>
  );
}
