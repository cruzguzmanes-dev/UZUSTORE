import React, { useState, useEffect } from "react";
import { fmt, sb } from "../utils";

const SLUGS   = ["gaticueva", "friki"];
const NOMBRES = { gaticueva: "Gaticueva", friki: "Friki" };
const COLORS  = { gaticueva: "#00C9FF", friki: "#FF6B9D" };

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });

export default function Distribuidores() {
  const [data,         setData]         = useState({ gaticueva: [], friki: [] });
  const [pagos,        setPagos]        = useState({ gaticueva: [], friki: [] });
  const [lotes,        setLotes]        = useState([]);
  const [distSettings, setDistSettings] = useState({ gaticueva: { modo_precio: "venta" }, friki: { modo_precio: "venta" } });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("gaticueva");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [results, lotesData, pagosGati, pagosFriki, settingsGati, settingsFriki] = await Promise.all([
        Promise.all(
          SLUGS.map(s => fetch(`/api/distribuidor/inventario?distribuidor=${s}`).then(r => r.ok ? r.json() : []))
        ),
        sb("lotes?select=id,titulo,sku,costo_unitario&order=titulo.asc").catch(() => []),
        fetch("/api/distribuidor/pagos?slug=gaticueva").then(r => r.ok ? r.json() : []),
        fetch("/api/distribuidor/pagos?slug=friki").then(r => r.ok ? r.json() : []),
        fetch("/api/distribuidor/settings?slug=gaticueva").then(r => r.ok ? r.json() : {}),
        fetch("/api/distribuidor/settings?slug=friki").then(r => r.ok ? r.json() : {}),
      ]);
      setData({ gaticueva: results[0] || [], friki: results[1] || [] });
      setLotes(lotesData || []);
      setPagos({ gaticueva: pagosGati || [], friki: pagosFriki || [] });
      setDistSettings({
        gaticueva: { modo_precio: settingsGati?.modo_precio || "venta" },
        friki:     { modo_precio: settingsFriki?.modo_precio || "venta" },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateModoPrecio = async (slug, modo) => {
    // Optimistic update
    setDistSettings(prev => ({ ...prev, [slug]: { ...prev[slug], modo_precio: modo } }));
    try {
      const res = await fetch("/api/distribuidor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, modo_precio: modo }),
      });
      if (!res.ok) throw new Error("Error actualizando");
    } catch (e) {
      // Revert on error
      setDistSettings(prev => ({ ...prev, [slug]: { ...prev[slug], modo_precio: modo === "venta" ? "mayoreo" : "venta" } }));
      alert("Error: " + e.message);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const setMayoreo = async (id, valor, loteSku) => {
    await fetch(`/api/distribuidor/inventario?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        precio_mayoreo: parseFloat(valor) || 0,
        ...(loteSku !== undefined && { lote_sku: loteSku }),
      }),
    });
    fetchAll();
  };

  const registrarPago = async (slug, monto, tipo, notas) => {
    const res = await fetch("/api/distribuidor/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, monto, tipo, notas }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Error registrando pago");
    }
    fetchAll();
  };

  // Resumen total
  const resumen = SLUGS.map(slug => {
    const items       = data[slug] || [];
    const vendidas    = items.reduce((s, i) => s + (i.vendidas || 0), 0);
    const totalVentas = items.reduce((s, i) => s + (i.precio_venta * (i.vendidas || 0)), 0);
    const teDeben     = items.reduce((s, i) => s + ((i.precio_mayoreo || 0) * (i.vendidas || 0)), 0);
    const ganancia    = totalVentas - teDeben;
    const stock       = items.reduce((s, i) => s + i.cantidad, 0);
    const totalPagado = (pagos[slug] || []).reduce((s, p) => s + p.monto, 0);
    const saldo       = teDeben - totalPagado;
    return { slug, vendidas, totalVentas, teDeben, ganancia, stock, items, totalPagado, saldo };
  });

  const totalSaldo = resumen.reduce((s, r) => s + r.saldo, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif" }}>
          🏪 Distribuidores
        </h2>
        <p style={{ color: "#888", margin: 0, fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
          Inventario · Precios · Cortes
        </p>
      </div>

      {/* Resumen saldo pendiente */}
      <div style={{
        background: "rgba(255,224,0,0.05)", border: "1px solid rgba(255,224,0,0.2)",
        borderRadius: 14, padding: 20, marginBottom: 28,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
      }}>
        {resumen.map(r => (
          <div key={r.slug} style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
              {NOMBRES[r.slug]}
            </p>
            <p style={{ margin: "0 0 2px 0", fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: r.saldo > 0 ? COLORS[r.slug] : "#3a3a3a" }}>
              {fmt(r.saldo)}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
              {r.vendidas} vendidas
            </p>
          </div>
        ))}
        <div style={{ textAlign: "center", gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
            Saldo total pendiente
          </p>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>
            {fmt(totalSaldo)}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: 14, marginBottom: 20, color: "#ff8080", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {SLUGS.map(s => (
          <button key={s} onClick={() => setTab(s)} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid",
            borderColor: tab === s ? COLORS[s] : "#2a2a2a",
            background: tab === s ? `${COLORS[s]}18` : "transparent",
            color: tab === s ? COLORS[s] : "#666",
            fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
          }}>
            {NOMBRES[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#666", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>Cargando...</p>
      ) : (
        <DistribuidorDetalle
          slug={tab}
          items={data[tab] || []}
          resumen={resumen.find(r => r.slug === tab)}
          color={COLORS[tab]}
          lotes={lotes}
          pagos={pagos[tab] || []}
          modoPrecio={distSettings[tab]?.modo_precio || "venta"}
          onSetMayoreo={setMayoreo}
          onRegistrarPago={registrarPago}
          onUpdateModoPrecio={updateModoPrecio}
        />
      )}
    </div>
  );
}

/* ─── Toggle switch ─── */
function Toggle({ checked, onChange, color = "#FFE000" }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        background: checked ? color : "#2a2a2a",
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute",
        top: 3, left: checked ? 23 : 3,
        width: 18, height: 18,
        borderRadius: "50%",
        background: checked ? "#000" : "#555",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────── */
function DistribuidorDetalle({ slug, items, resumen, color, lotes, pagos, modoPrecio = "venta", onSetMayoreo, onRegistrarPago, onUpdateModoPrecio }) {
  const [pagoSheet,    setPagoSheet]    = useState(null); // null | 'completo' | 'parcial' | 'historial'
  const [parcialMonto, setParcialMonto] = useState("");
  const [parcialNotas, setParcialNotas] = useState("");
  const [saving,       setSaving]       = useState(false);

  const { teDeben, totalPagado, saldo } = resumen;

  const handlePago = async (tipo) => {
    const monto = tipo === "completo" ? saldo : parseFloat(parcialMonto);
    if (!monto || monto <= 0) return;
    setSaving(true);
    try {
      await onRegistrarPago(slug, monto, tipo, parcialNotas || null);
      setPagoSheet(null);
      setParcialMonto("");
      setParcialNotas("");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const sheetStyle = {
    position: "fixed", inset: 0, zIndex: 999,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
    animation: "fadeInDist 0.15s ease",
  };
  const cardStyle = {
    background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 22,
    width: "calc(100% - 32px)", maxWidth: 420,
    animation: "slideUpDist 0.2s ease",
    maxHeight: "80vh", overflowY: "auto",
  };

  return (
    <>
      <style>{`
        @keyframes fadeInDist { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUpDist { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .pago-inp {
          width:100%; background:#111; border:1px solid #2a2a2a; border-radius:8px;
          padding:12px 14px; color:#fff; font-size:16px;
          font-family:'Space Mono',monospace; outline:none; box-sizing:border-box; margin-bottom:12px;
        }
        .pago-lbl {
          display:block; font-size:9px; color:#666; letter-spacing:2px;
          text-transform:uppercase; font-family:'Space Mono',monospace; margin-bottom:6px;
        }
        .hist-pago-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .hist-pago-row:last-child { border-bottom:none; }
      `}</style>

      {/* ── Sheet: Pago completo ── */}
      {pagoSheet === "completo" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💰 Pago completo
            </p>
            <p style={{ margin: "0 0 22px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              {NOMBRES[slug]} liquidará todo el saldo pendiente
            </p>

            <div style={{ background: "rgba(255,224,0,0.06)", border: "1px solid rgba(255,224,0,0.2)", borderRadius: 12, padding: 16, marginBottom: 22, textAlign: "center" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Monto a registrar</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>{fmt(saldo)}</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPagoSheet(null)}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => handlePago("completo")} disabled={saving || saldo <= 0}
                style={{ flex: 2, background: saving || saldo <= 0 ? "#333" : "#1e3a1e", border: saving || saldo <= 0 ? "1px solid #333" : "1px solid #2d5a2d", color: saving || saldo <= 0 ? "#555" : "#7ecc7e", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving || saldo <= 0 ? "not-allowed" : "pointer" }}>
                {saving ? "Registrando..." : "✓ Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Pago parcial ── */}
      {pagoSheet === "parcial" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💸 Pago parcial
            </p>
            <p style={{ margin: "0 0 20px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              Saldo pendiente: <span style={{ color: "#FFE000" }}>{fmt(saldo)}</span>
            </p>

            <label className="pago-lbl">Monto pagado $</label>
            <input className="pago-inp" type="number" step="0.01" min="1"
              value={parcialMonto} onChange={e => setParcialMonto(e.target.value)}
              placeholder="Ej: 1000" autoFocus />

            <label className="pago-lbl">Nota (opcional)</label>
            <input className="pago-inp" type="text"
              value={parcialNotas} onChange={e => setParcialNotas(e.target.value)}
              placeholder="Ej: transferencia 15 mar" />

            {parcialMonto && parseFloat(parcialMonto) > 0 && (
              <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", textAlign: "center" }}>
                Quedará pendiente: <strong style={{ color: saldo - parseFloat(parcialMonto) <= 0 ? "#7ecc7e" : "#FFE000" }}>
                  {fmt(Math.max(0, saldo - parseFloat(parcialMonto)))}
                </strong>
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setPagoSheet(null); setParcialMonto(""); setParcialNotas(""); }}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => handlePago("parcial")} disabled={saving || !parcialMonto || parseFloat(parcialMonto) <= 0}
                style={{ flex: 2, background: saving || !parcialMonto ? "#333" : "#1a2a3a", border: saving || !parcialMonto ? "1px solid #333" : "1px solid #2a4a5a", color: saving || !parcialMonto ? "#555" : "#7ec5cc", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving || !parcialMonto ? "not-allowed" : "pointer" }}>
                {saving ? "Registrando..." : "✓ Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Historial de pagos ── */}
      {pagoSheet === "historial" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                🧾 Historial de pagos
              </p>
              <button onClick={() => setPagoSheet(null)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              {NOMBRES[slug]} · {pagos.length} registro{pagos.length !== 1 ? "s" : ""}
            </p>

            {pagos.length === 0 ? (
              <p style={{ textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Sin pagos registrados aún
              </p>
            ) : (
              <>
                {/* Resumen */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 3px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Total cobrado</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#7ecc7e" }}>{fmt(totalPagado)}</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 3px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Saldo</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>{fmt(saldo)}</p>
                  </div>
                </div>

                {/* Lista */}
                {pagos.map(p => (
                  <div key={p.id} className="hist-pago-row">
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666", marginBottom: 2 }}>
                        {fmtFecha(p.created_at)}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{
                          background: p.tipo === "completo" ? "rgba(126,204,126,0.12)" : "rgba(126,197,204,0.12)",
                          border: `1px solid ${p.tipo === "completo" ? "rgba(126,204,126,0.3)" : "rgba(126,197,204,0.3)"}`,
                          color: p.tipo === "completo" ? "#7ecc7e" : "#7ec5cc",
                          borderRadius: 4, padding: "1px 7px",
                          fontSize: 9, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1,
                        }}>
                          {p.tipo}
                        </span>
                        {p.notas && (
                          <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{p.notas}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: "#7ecc7e" }}>
                      {fmt(p.monto)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Modo de inventario (toggle) ─── */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: "12px 16px",
        marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ margin: "0 0 2px 0", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: "#fff" }}>
            Modo de inventario
          </p>
          <p style={{ margin: 0, fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#666" }}>
            {modoPrecio === "venta"
              ? "Registra su propio precio de venta"
              : "Usa el precio que le asigné (mayoreo)"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: modoPrecio === "venta" ? color : "#444" }}>
            Su precio
          </span>
          <Toggle
            checked={modoPrecio === "mayoreo"}
            onChange={(v) => onUpdateModoPrecio(slug, v ? "mayoreo" : "venta")}
            color={color}
          />
          <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: modoPrecio === "mayoreo" ? color : "#444" }}>
            Mi precio
          </span>
        </div>
      </div>

      {/* ─── Corte del distribuidor ─── */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${color}33`,
        borderRadius: 14, padding: 18, marginBottom: 16,
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
      }}>
        <CorteItem label="En stock"          value={resumen.stock} />
        <CorteItem label="Vendidas"          value={resumen.vendidas} />
        <CorteItem label="Sus ventas totales" value={fmt(teDeben + resumen.ganancia)} />
        <CorteItem label="Total a cobrar"    value={fmt(teDeben)} />
        <CorteItem label="Ya pagado"         value={fmt(totalPagado)} color="#7ecc7e" style={{ gridColumn: "1 / -1" }} />
      </div>

      {/* ─── Saldo pendiente + botones de pago ─── */}
      <div style={{
        background: saldo > 0 ? "rgba(255,224,0,0.05)" : "rgba(0,200,100,0.05)",
        border: `1px solid ${saldo > 0 ? "rgba(255,224,0,0.25)" : "rgba(0,200,100,0.2)"}`,
        borderRadius: 14, padding: 18, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: saldo > 0 ? 14 : 0 }}>
          <div>
            <p style={{ margin: "0 0 3px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
              Saldo pendiente
            </p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>
              {fmt(saldo)}
              {saldo <= 0 && <span style={{ fontSize: 12, color: "#7ecc7e", marginLeft: 8 }}>✓ Al corriente</span>}
            </p>
          </div>
          <button
            onClick={() => setPagoSheet("historial")}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
            🧾 Ver pagos
          </button>
        </div>

        {saldo > 0 && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setPagoSheet("parcial")}
              style={{ flex: 1, background: "#1a2a3a", border: "1px solid #2a4a5a", color: "#7ec5cc", borderRadius: 10, padding: "11px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              💸 Pago parcial
            </button>
            <button
              onClick={() => setPagoSheet("completo")}
              style={{ flex: 1, background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 10, padding: "11px 0", fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              💰 Pago completo
            </button>
          </div>
        )}
      </div>

      {/* ─── Lista de artículos con mayoreo editable ─── */}
      {items.length === 0 ? (
        <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          Sin artículos aún
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} color={color} lotes={lotes} onSetMayoreo={onSetMayoreo} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────── */
function ItemRow({ item, color, lotes, onSetMayoreo }) {
  const [editando,     setEditando]     = useState(false);
  const [val,          setVal]          = useState(item.precio_mayoreo || "");
  const [selectedSku,  setSelectedSku]  = useState(item.lote_sku || "");

  const vendidas = item.vendidas || 0;
  const mayoreo  = item.precio_mayoreo || 0;
  const teDebe   = mayoreo * vendidas;
  const ganancia = (item.precio_venta - mayoreo) * vendidas;

  // Ganancia del dueño si está vinculado a un lote
  const loteVinculado   = item.lote_sku ? lotes.find(l => l.sku === item.lote_sku) : null;
  const miGananciaUnit  = loteVinculado ? (mayoreo - loteVinculado.costo_unitario) : null;
  const miGananciaTotal = miGananciaUnit !== null && vendidas > 0 ? miGananciaUnit * vendidas : null;

  const handleLotePick = (sku) => {
    setSelectedSku(sku);
    if (sku) {
      const lote = lotes.find(l => l.sku === sku);
      if (lote) setVal(String(lote.costo_unitario));
    }
  };

  const handleManualVal = (v) => {
    setVal(v);
    setSelectedSku("");
  };

  const guardar = () => {
    onSetMayoreo(item.id, val, selectedSku);
    setEditando(false);
  };

  const cancelar = () => {
    setVal(item.precio_mayoreo || "");
    setSelectedSku(item.lote_sku || "");
    setEditando(false);
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {item.foto_url
        ? <img src={item.foto_url} alt={item.nombre} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 22, flexShrink: 0 }}>📦</div>
      }

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.nombre || "Sin nombre"}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
          {item.precio_venta > 0
            ? <span style={{ color }}>Precio: {fmt(item.precio_venta)}</span>
            : <span style={{ color: "#444", fontStyle: "italic" }}>Precio privado</span>
          }
          <span style={{ color: "#888" }}>Stock: {item.cantidad}</span>
          <span style={{ color: "#aaa" }}>Vendidas: {vendidas}</span>
        </div>

        {/* Mayoreo editable */}
        <div style={{ marginBottom: vendidas > 0 && mayoreo > 0 ? 8 : 0 }}>
          {editando ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lotes.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#555", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    Vincular a lote del inventario
                  </div>
                  <select
                    value={selectedSku}
                    onChange={e => handleLotePick(e.target.value)}
                    style={{ width: "100%", background: "#111", border: `1px solid ${selectedSku ? "#444" : "#2a2a2a"}`, borderRadius: 6, padding: "7px 10px", color: selectedSku ? "#fff" : "#555", fontSize: 12, fontFamily: "'Space Mono', monospace", outline: "none", cursor: "pointer" }}>
                    <option value="">— Elegir del inventario —</option>
                    {lotes.map(l => (
                      <option key={l.id} value={l.sku}>
                        {l.titulo}  ·  SKU: {l.sku}  ·  {fmt(l.costo_unitario)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>$ Mayoreo</span>
                <input
                  type="number" value={val} onChange={e => handleManualVal(e.target.value)}
                  step="0.01" placeholder="0.00" autoFocus={lotes.length === 0}
                  style={{ flex: 1, minWidth: 0, background: "#111", border: "1px solid #444", borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none" }} />
                <button onClick={guardar} disabled={!val}
                  style={{ background: val ? "#FFE000" : "#333", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: val ? "pointer" : "not-allowed", color: val ? "#000" : "#666", flexShrink: 0 }}>✓</button>
                <button onClick={cancelar}
                  style={{ background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Mayoreo:</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: mayoreo > 0 ? "#fff" : "#555" }}>
                {mayoreo > 0 ? fmt(mayoreo) : "—"}
              </span>
              {item.lote_sku && (
                <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 7px", fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace" }}>
                  {item.lote_sku}
                </span>
              )}
              <button onClick={() => setEditando(true)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#aaa", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
                editar
              </button>
            </div>
          )}
        </div>

        {/* Resumen financiero */}
        {vendidas > 0 && mayoreo > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
            <span style={{ color: "#ff8080" }}>Te debe: {fmt(teDebe)}</span>
            <span style={{ color: "#7ecc7e" }}>Su gan.: {fmt(ganancia)}</span>
            {miGananciaTotal !== null && (
              <span style={{ color: "#FFE000" }}>Mi gan.: {fmt(miGananciaTotal)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
function CorteItem({ label, value, highlight, color, style }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, textAlign: "center", ...style }}>
      <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: color || (highlight ? "#FFE000" : "#fff") }}>
        {value}
      </p>
    </div>
  );
}
