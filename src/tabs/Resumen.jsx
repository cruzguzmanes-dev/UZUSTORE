import StatCard from "../components/StatCard";
import { fmt, fmtPct } from "../utils";

export default function Resumen({ ordersWithFIFO, paidOrders, lotes, totalVentas, totalNetoML, totalCostos, gananciaAntesTax, ivaPendienteSAT, gananciaNeta, onAgregarLote }) {
  const skuMap = {};
  ordersWithFIFO.forEach(o => {
    if (!skuMap[o.sku]) skuMap[o.sku] = { title: o.title, sku: o.sku, ventas: 0, unidades: 0, costos: 0, utilidad: 0 };
    skuMap[o.sku].ventas += o.salePrice || 0;
    skuMap[o.sku].unidades += 1;
    skuMap[o.sku].costos += o.costo || 0;
    skuMap[o.sku].utilidad += o.utilidad || 0;
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Ventas Totales" value={fmt(totalVentas)} sub={`${paidOrders.length} órdenes`} accent="linear-gradient(90deg,#FFE000,#FF9500)" icon="💰" />
        <StatCard label="Neto ML" value={fmt(totalNetoML)} sub="Después de comisiones ML" accent="linear-gradient(90deg,#00C9FF,#0080FF)" icon="🏦" />
        <StatCard label="Costo FIFO" value={fmt(totalCostos)} sub="Costo real de productos" accent="linear-gradient(90deg,#FF5050,#FF0080)" icon="📦" />
        <StatCard label="Utilidad Real" value={fmt(gananciaAntesTax)} sub="Neto ML − costo − IVA SAT" accent="linear-gradient(90deg,#00FF94,#00C9FF)" icon="📈" />
      </div>

      {lotes.length === 0 && (
        <div style={{ background: "rgba(255,224,0,0.06)", border: "1px solid rgba(255,224,0,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#FFE000", marginBottom: 4 }}>⚠ Sin lotes de inventario</div>
            <div style={{ fontSize: 12, color: "#888", fontFamily: "'Space Mono', monospace" }}>Agrega tus lotes para calcular utilidad real con método FIFO</div>
          </div>
          <button onClick={onAgregarLote} style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", marginLeft: 16 }}>+ Agregar Lote</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 20, textTransform: "uppercase" }}>Desglose Financiero</div>
          {[
            { label: "Precio venta bruto", val: totalVentas, color: "#888" },
            { label: "− Comisiones + retenciones ML", val: -(totalVentas - (totalNetoML || totalVentas)), color: "#FF5050" },
            { label: "= Neto acreditado por ML", val: totalNetoML || totalVentas, color: "#00C9FF", bold: true },
            { label: "− Costo FIFO piezas", val: -totalCostos, color: "#FF5050" },
            { label: "− IVA pendiente SAT (8%)", val: -ivaPendienteSAT, color: "#FF8C00", note: "El otro 8% ya lo retuvo ML" },
            { label: "= Utilidad real estimada", val: gananciaAntesTax, color: "#00FF94", bold: true },
          ].map((r, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>{r.label}</span>
                <span style={{ fontWeight: r.bold ? 700 : 400, color: r.color, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{fmt(r.val)}</span>
              </div>
              {r.note && <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>{r.note}</div>}
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 20, textTransform: "uppercase" }}>Top Productos · Utilidad FIFO</div>
          {Object.values(skuMap).sort((a, b) => b.utilidad - a.utilidad).slice(0, 6).map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 12, color: "#ddd" }}>{(p.title || "").slice(0, 28)}...</div>
                <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                  {p.unidades} vendidos · {p.costos > 0 ? fmt(p.costos / p.unidades) + "/u" : "sin costo"}
                </div>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: p.utilidad > 0 ? "#00FF94" : p.utilidad < 0 ? "#FF5050" : "#555" }}>
                {p.utilidad !== 0 ? fmt(p.utilidad) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
