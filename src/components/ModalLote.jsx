import { useState } from "react";
import { sb } from "../utils";

export default function ModalLote({ skus, onClose, onSaved }) {
  const [sku, setSku] = useState(skus[0]?.sku || "");
  const [titulo, setTitulo] = useState(skus[0]?.title || "");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSkuChange = (val) => {
    setSku(val);
    const found = skus.find(s => s.sku === val);
    if (found) setTitulo(found.title);
  };

  const handleSave = async () => {
    if (!sku || !cantidad || !costo) { setError("Todos los campos son requeridos"); return; }
    setLoading(true); setError("");
    try {
      await sb("lotes", "POST", {
        sku, titulo,
        cantidad_inicial: parseInt(cantidad),
        cantidad_disponible: parseInt(cantidad),
        costo_unitario: parseFloat(costo),
        fecha_compra: fecha,
      });
      onSaved(); onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = { width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none" };
  const lbl = { display: "block", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>➕ Agregar Lote de Inventario</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <label style={lbl}>Producto (SKU)</label>
        <select value={sku} onChange={e => handleSkuChange(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
          {skus.map(s => <option key={s.sku} value={s.sku}>{s.title.slice(0, 40)} — {s.sku}</option>)}
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Cantidad</label><input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 10" style={inp} /></div>
          <div><label style={lbl}>Costo unitario $</label><input type="number" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Ej: 377" style={inp} /></div>
        </div>
        <label style={lbl}>Fecha de compra</label>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...inp, marginBottom: 20 }} />
        {error && <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ff8080", fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 16 }}>⚠ {error}</div>}
        <button onClick={handleSave} disabled={loading} style={{ width: "100%", background: loading ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>
          {loading ? "Guardando..." : "Guardar Lote →"}
        </button>
      </div>
    </div>
  );
}
