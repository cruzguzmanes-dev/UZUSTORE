import StatCard from "../components/StatCard";
import { fmt, fmtPct } from "../utils";
import { MESES, TAX } from "../constants";

export default function Mensual({ ordersWithFIFO, paidOrders, totalVentas, totalNetoML, totalCostos, gananciaAntesTax, isrRetenido, ivaRetenidoML, ivaPendienteSAT }) {
  const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" };
  const tdMono = (color = "#fff") => ({ padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontSize: 13, color });

  const ventasPorMes = {};
  ordersWithFIFO.forEach(o => {
    const [year, month] = o.date.split("-");
    const key = `${year}-${month}`;
    if (!ventasPorMes[key]) ventasPorMes[key] = { key, year, month: parseInt(month), ventas: 0, netoML: 0, costos: 0, ivaPendiente: 0, utilidad: 0, ordenes: 0, isr: 0, iva: 0 };
    const base = o.baseGravable || o.salePrice * 0.8621;
    ventasPorMes[key].ventas += o.salePrice;
    ventasPorMes[key].netoML += (o.netoML || o.salePrice);
    ventasPorMes[key].costos += (o.costo || 0);
    ventasPorMes[key].ivaPendiente += base * 0.08;
    ventasPorMes[key].utilidad += (o.utilidad || 0);
    ventasPorMes[key].ordenes += 1;
    ventasPorMes[key].isr += base * TAX.ISR;
    ventasPorMes[key].iva += base * TAX.IVA_SAT;
  });

  const mesesOrdenados = Object.values(ventasPorMes).sort((a, b) => b.key.localeCompare(a.key));
  const mejorMes = [...mesesOrdenados].sort((a, b) => b.ventas - a.ventas)[0];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Meses con ventas" value={mesesOrdenados.length} accent="linear-gradient(90deg,#FFE000,#FF9500)" icon="📅" />
        <StatCard label="Mejor mes" value={mejorMes ? MESES[mejorMes.month - 1] : "—"} sub={mejorMes ? fmt(mejorMes.ventas) : ""} accent="linear-gradient(90deg,#00FF94,#00C9FF)" icon="🏆" />
        <StatCard label="Promedio mensual" value={fmt(mesesOrdenados.length > 0 ? totalVentas / mesesOrdenados.length : 0)} accent="linear-gradient(90deg,#A855F7,#6366F1)" icon="📊" />
        <StatCard label="IVA promedio/mes" value={fmt(mesesOrdenados.length > 0 ? ivaPendienteSAT / mesesOrdenados.length : 0)} sub="A apartar cada mes" accent="linear-gradient(90deg,#FF5050,#FF0080)" icon="⚠️" />
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              {["Mes", "Órdenes", "Precio Venta", "Neto ML", "Costo FIFO", "IVA Pendiente", "Utilidad Real", "Margen"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mesesOrdenados.map((m, i) => {
              const ganBruta = m.netoML - m.costos - m.ivaPendiente;
              const margen = m.netoML > 0 ? ganBruta / m.netoML : 0;
              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{MESES[m.month - 1]}</div>
                    <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{m.year}</div>
                  </td>
                  <td style={tdMono("#aaa")}>{m.ordenes}</td>
                  <td style={tdMono("#888")}>{fmt(m.ventas)}</td>
                  <td style={tdMono("#00C9FF")}>{fmt(m.netoML)}</td>
                  <td style={tdMono("#ff8080")}>{fmt(m.costos)}</td>
                  <td style={{ ...tdMono("#FF8C00"), fontWeight: 600 }}>{fmt(m.ivaPendiente)}</td>
                  <td style={tdMono(ganBruta >= 0 ? "#00FF94" : "#FF5050")}>{fmt(ganBruta)}</td>
                  <td style={tdMono(margen >= 0.3 ? "#00FF94" : margen >= 0.1 ? "#FFE000" : "#FF5050")}>{fmtPct(margen)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <td style={{ padding: 16, fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#888", fontWeight: 700 }}>TOTAL</td>
              <td style={tdMono("#aaa")}>{paidOrders.length}</td>
              <td style={{ ...tdMono("#888"), fontWeight: 700 }}>{fmt(totalVentas)}</td>
              <td style={{ ...tdMono("#00C9FF"), fontWeight: 700 }}>{fmt(totalNetoML)}</td>
              <td style={{ ...tdMono("#ff8080"), fontWeight: 700 }}>{fmt(totalCostos)}</td>
              <td style={{ ...tdMono("#FF8C00"), fontWeight: 700 }}>{fmt(ivaPendienteSAT)}</td>
              <td style={{ ...tdMono("#00FF94"), fontWeight: 700 }}>{fmt(gananciaAntesTax)}</td>
              <td style={{ ...tdMono("#00FF94"), fontWeight: 700 }}>{fmtPct(totalNetoML > 0 ? gananciaAntesTax / totalNetoML : 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
