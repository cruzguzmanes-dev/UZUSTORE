export default function Steps({ current }) {
  const steps = ["Credenciales", "Autorizar en ML", "Conectar"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", background: i < current ? "#00FF94" : i === current ? "#FFE000" : "rgba(255,255,255,0.08)", color: i <= current ? "#000" : "#555", transition: "all 0.3s" }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: i === current ? "#FFE000" : i < current ? "#00FF94" : "#555", whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 50, height: 1, background: i < current ? "#00FF94" : "rgba(255,255,255,0.1)", margin: "0 8px", marginBottom: 20, transition: "all 0.3s" }} />}
        </div>
      ))}
    </div>
  );
}
