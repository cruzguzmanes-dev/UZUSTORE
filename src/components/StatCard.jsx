export default function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: "#fff", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#666", marginTop: 6, fontFamily: "'Space Mono', monospace" }}>{sub}</div>}
      <div style={{ position: "absolute", right: 20, top: 20, fontSize: 22, opacity: 0.15 }}>{icon}</div>
    </div>
  );
}
