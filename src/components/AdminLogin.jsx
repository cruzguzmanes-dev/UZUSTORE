import { useState, useEffect } from "react";
import { REDIRECT_URI, GS } from "../constants";

const TOKEN_KEY = "ml_access_token";
const TOKEN_EXP_KEY = "ml_token_expires_at";

export default function AdminLogin({ onConnect, onMock }) {
  const [mode, setMode] = useState("login"); // "login" | "ml_connect"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);

  // Intentar auto-login al cargar: si hay token válido en localStorage
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = localStorage.getItem(TOKEN_EXP_KEY);
    if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
      onConnect(token);
      return;
    }

    // Manejar callback de OAuth de ML (primera configuración)
    const code = new URLSearchParams(window.location.search).get("code");
    const savedAppId = localStorage.getItem("ml_app_id");
    const savedSecret = localStorage.getItem("ml_secret");
    if (code && savedAppId && savedSecret) {
      setAutoConnecting(true);
      window.history.replaceState({}, document.title, "/");
      fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: savedAppId,
          client_secret: savedSecret,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.access_token) throw new Error(data.error || "No se obtuvo el token");
          // Guardar token con expiración (6 horas)
          localStorage.setItem(TOKEN_KEY, data.access_token);
          localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + (data.expires_in || 21600) * 1000));
          localStorage.removeItem("ml_app_id");
          localStorage.removeItem("ml_secret");
          onConnect(data.access_token);
        })
        .catch((e) => { setError(e.message); setAutoConnecting(false); });
    }
  }, [onConnect]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. Verificar credenciales
      const loginRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || "Credenciales inválidas");

      // 2. Si ML está configurado, intentar refresh automático
      if (loginData.ml_configured) {
        const refreshRes = await fetch("/api/admin/refresh", { method: "POST" });
        const refreshData = await refreshRes.json();

        if (refreshRes.ok && refreshData.access_token) {
          // Guardar token con expiración
          localStorage.setItem(TOKEN_KEY, refreshData.access_token);
          localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + (refreshData.expires_in || 21600) * 1000));
          onConnect(refreshData.access_token);
          return;
        }

        // refresh_token expirado → reconectar ML una vez
        if (refreshData.error === "refresh_expired" || refreshData.error === "no_refresh_token") {
          setMode("ml_connect");
          return;
        }

        throw new Error(refreshData.message || refreshData.error || "Error al conectar con MercadoLibre");
      }

      // ML no configurado → mostrar pantalla de conexión ML
      setMode("ml_connect");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMLConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ml-auth-url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error obteniendo URL de ML");
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const inp = {
    width: "100%",
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "13px 16px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Space Mono', monospace",
    outline: "none",
  };
  const lbl = {
    display: "block",
    fontSize: 10,
    fontFamily: "'Space Mono', monospace",
    color: "#888",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  };

  if (autoConnecting) return (
    <div style={{ minHeight: "100vh", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{GS}</style>
      <div style={{ textAlign: "center", fontFamily: "'Syne', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>📦</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Conectando con MercadoLibre...</div>
        <div style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#555" }}>Guardando sesión para futuros accesos</div>
        {error && <div style={{ marginTop: 20, color: "#ff8080", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>⚠ {error}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", padding: 20 }}>
      <style>{GS}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -1 }}>UZUSTORE</h1>
          <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 11, marginTop: 8, letterSpacing: 2 }}>
            {mode === "login" ? "PANEL ADMIN" : "CONECTAR MERCADOLIBRE"}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32 }}>
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Acceso Admin</div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 24 }}>
                Ingresa tus credenciales de administrador
              </div>
              <label style={lbl}>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                style={{ ...inp, marginBottom: 16 }}
                autoComplete="username"
              />
              <label style={lbl}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ ...inp, marginBottom: 24 }}
                autoComplete="current-password"
              />
              {error && (
                <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ff8080", fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: loading ? "#333" : "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: loading ? "not-allowed" : "pointer", marginBottom: 12 }}
              >
                {loading ? "Verificando..." : "Entrar →"}
              </button>
              <button
                type="button"
                onClick={onMock}
                style={{ width: "100%", background: "transparent", color: "#555", border: "1px solid #222", borderRadius: 10, padding: 12, fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}
              >
                Ver demo con datos de feb 2026
              </button>
            </form>
          )}

          {mode === "ml_connect" && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Conectar MercadoLibre</div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 24 }}>
                Solo necesitas hacer esto una vez. Después el acceso es automático.
              </div>
              <div style={{ background: "rgba(255, 224, 0, 0.05)", border: "1px solid rgba(255, 224, 0, 0.2)", borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#aaa", lineHeight: 1.6 }}>
                ⚠ Asegúrate de haber configurado <span style={{ color: "#FFE000" }}>ML_CLIENT_ID</span> y <span style={{ color: "#FFE000" }}>ML_CLIENT_SECRET</span> en las variables de entorno de Vercel.
              </div>
              {error && (
                <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ff8080", fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}
              <button
                onClick={handleMLConnect}
                style={{ width: "100%", background: "#FFE000", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", marginBottom: 12 }}
              >
                Autorizar con MercadoLibre →
              </button>
              <button
                onClick={() => { setMode("login"); setError(""); }}
                style={{ width: "100%", background: "transparent", color: "#555", border: "1px solid #222", borderRadius: 10, padding: 12, fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}
              >
                ← Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
