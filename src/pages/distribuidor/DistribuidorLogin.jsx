import { useState } from "react";
import { GS } from "../../constants";

// Guarda sesión del distribuidor por 30 días
const SESSION_KEY = (slug) => `dist_session_${slug}`;
const SESSION_EXP_KEY = (slug) => `dist_session_exp_${slug}`;
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

export function getDistribuidorSession(slug) {
  const token = localStorage.getItem(SESSION_KEY(slug));
  const exp = localStorage.getItem(SESSION_EXP_KEY(slug));
  if (token && exp && Date.now() < parseInt(exp)) return token;
  localStorage.removeItem(SESSION_KEY(slug));
  localStorage.removeItem(SESSION_EXP_KEY(slug));
  return null;
}

export default function DistribuidorLogin({ slug, onLogin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError("Ingresa tu código de acceso"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/distribuidor/auth?slug=${slug}&code=${code.trim()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Código inválido");

      // Guardar sesión por 30 días
      localStorage.setItem(SESSION_KEY(slug), code.trim());
      localStorage.setItem(SESSION_EXP_KEY(slug), String(Date.now() + DAYS_30));
      onLogin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", padding: 20 }}>
      <style>{GS}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -1 }}>UZUSTORE</h1>
          <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11, marginTop: 8, letterSpacing: 2, textTransform: "uppercase" }}>
            {slug}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Código de acceso</div>
          <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 24 }}>
            Ingresa tu código para ver tu inventario
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                padding: "13px 16px",
                color: "#fff",
                fontSize: 18,
                fontFamily: "'Space Mono', monospace",
                outline: "none",
                textAlign: "center",
                letterSpacing: 4,
                marginBottom: 16,
              }}
            />
            {error && (
              <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ff8080", fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: loading ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Verificando..." : "Entrar →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
