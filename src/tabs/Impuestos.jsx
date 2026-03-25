import StatCard from "../components/StatCard";
import { fmt } from "../utils";

export default function Impuestos({ totalBase, isrRetenido, ivaRetenidoML, ivaPendienteSAT }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Base Gravable" value={fmt(totalBase)} sub="Total del periodo" accent="linear-gradient(90deg,#FFE000,#FF9500)" icon="🧾" />
        <StatCard label="ISR Retenido ML" value={fmt(isrRetenido)} sub="2.5% ya descontado" accent="linear-gradient(90deg,#00C9FF,#92FE9D)" icon="✅" />
        <StatCard label="IVA Retenido ML" value={fmt(ivaRetenidoML)} sub="8% ya descontado" accent="linear-gradient(90deg,#00C9FF,#92FE9D)" icon="✅" />
        <StatCard label="IVA Pendiente SAT" value={fmt(ivaPendienteSAT)} sub="8% a declarar este mes" accent="linear-gradient(90deg,#FF5050,#FF0080)" icon="⚠️" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 20, textTransform: "uppercase" }}>Desglose de Impuestos</div>
          {[
            { label: "Base gravable total", val: fmt(totalBase) },
            { label: "ISR retenido por ML", val: fmt(isrRetenido), note: "2.5% — acreditable en anual", ok: true },
            { label: "IVA retenido por ML", val: fmt(ivaRetenidoML), note: "8% — acreditable en mensual", ok: true },
            { label: "IVA total causado (16%)", val: fmt(totalBase * 0.16) },
            { label: "IVA pendiente al SAT", val: fmt(ivaPendienteSAT), note: "8% a declarar (antes deducciones)", warn: true },
            { label: "Cedular Guanajuato", val: fmt(0), note: "Tasa 0%", ok: true },
            { label: "Total retenido por ML", val: fmt(isrRetenido + ivaRetenidoML), note: "Ya descontado de tus cobros", ok: true },
          ].map((r, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#ccc", fontFamily: "'Space Mono', monospace" }}>{r.label}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: r.warn ? "#FF5050" : r.ok ? "#00FF94" : "#fff" }}>{r.val}</span>
              </div>
              {r.note && <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginTop: 3 }}>{r.note}</div>}
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, marginBottom: 20, textTransform: "uppercase" }}>Guía de Pagos</div>
          {[
            { titulo: "Declaración mensual IVA", desc: `Pagar ${fmt(ivaPendienteSAT)} aprox. antes del día 17. Puedes restar tu IVA acreditable.`, color: "#FF5050", icon: "📅" },
            { titulo: "ISR provisional", desc: `ML ya retuvo ${fmt(isrRetenido)} (2.5%). Se acredita en tu declaración anual.`, color: "#00FF94", icon: "✅" },
            { titulo: "Declaración anual ISR", desc: "Al final del año calculas tu ISR definitivo. El retenido por ML se acredita completo.", color: "#A855F7", icon: "📊" },
            { titulo: "Recomendación", desc: "Guarda el 8% de cada venta para tu IVA mensual. Con deducciones pagas menos.", color: "#FFE000", icon: "💡" },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16, marginBottom: 12, borderLeft: `3px solid ${item.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{item.icon} {item.titulo}</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
