import React, { useState, useEffect } from "react";
import { fmt } from "../../utils";
import { GS } from "../../constants";
import UploadForm from "./UploadForm";
import InventarioTable from "./InventarioTable";
import DistribuidorLogin, { getDistribuidorSession, getDistribuidorRole } from "./DistribuidorLogin";
import Loader from "../../components/Loader";

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const CSS = `
  ${GS}
  .dist-wrap {
    min-height: 100vh;
    min-height: 100dvh;
    background: #0a0a0f; color: #fff;
    padding: 20px 16px 40px;
    padding-top: max(20px, env(safe-area-inset-top, 20px));
    padding-bottom: max(40px, env(safe-area-inset-bottom, 40px));
    padding-left: max(16px, env(safe-area-inset-left, 16px));
    padding-right: max(16px, env(safe-area-inset-right, 16px));
  }
  .dist-inner { max-width: 700px; margin: 0 auto; }
  .dist-header { margin-bottom: 24px; }
  .dist-title { font-size: 24px; font-weight: 800; margin: 0 0 4px 0; font-family: 'Syne', sans-serif; line-height: 1.2; }
  .dist-sub { color: #666; margin: 0; font-size: 12px; font-family: 'Space Mono', monospace; }
  .dist-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .stat-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 12px 8px; text-align: center;
  }
  .stat-label { font-family: 'Space Mono', monospace; font-size: 8px; color: #666; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 5px 0; }
  .stat-value { font-family: 'Space Mono', monospace; font-size: 20px; font-weight: 700; margin: 0; color: #fff; }
  .stat-value.money { font-size: 16px; }

  /* Saldo con proveedor (todos los roles) */
  .saldo-card {
    border-radius: 14px; padding: 18px; margin-bottom: 20px;
  }
  .saldo-card.debe { background: rgba(255,224,0,0.05); border: 1px solid rgba(255,224,0,0.22); }
  .saldo-card.ok   { background: rgba(0,200,100,0.05); border: 1px solid rgba(0,200,100,0.2); }
  .saldo-label { font-family: 'Space Mono', monospace; font-size: 10px; color: #888; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 4px 0; }
  .saldo-monto { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; margin: 0; }
  .saldo-sub { font-family: 'Space Mono', monospace; font-size: 11px; color: #666; margin: 6px 0 0 0; }

  /* Corte extra (solo admin) */
  .corte-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px; padding: 18px; margin-bottom: 20px;
  }
  .corte-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: #fff; margin: 0 0 14px 0; }
  .corte-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .corte-row:last-child { border-bottom: none; }
  .corte-label { font-family: 'Space Mono', monospace; font-size: 11px; color: #888; }
  .corte-val { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: #fff; }
  .corte-val.green { color: #7ecc7e; }

  .dist-section-title { font-size: 16px; font-weight: 700; margin: 0 0 14px 0; font-family: 'Syne', sans-serif; color: #fff; }
  .dist-search {
    width: 100%; background: #111; border: 1px solid #2a2a2a; border-radius: 10px;
    padding: 12px 14px; color: #fff; font-size: 16px; font-family: 'Space Mono', monospace;
    outline: none; box-sizing: border-box; margin-bottom: 14px;
  }
  .dist-search::placeholder { color: #444; }
  .dist-empty { color: #555; font-family: 'Space Mono', monospace; font-size: 13px; text-align: center; padding: 32px 0; }

  /* Botones de pago */
  .pay-btn {
    width: 100%; border-radius: 10px; padding: 12px 0; font-weight: 700;
    font-family: 'Syne', sans-serif; font-size: 14px; cursor: pointer; border: none;
  }
  .pay-btn.primary { background: #FFE000; color: #000; }
  .pay-btn.ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #aaa; font-family: 'Space Mono', monospace; font-size: 12px; }

  /* Sheet de pago */
  .pay-overlay {
    position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.7);
    display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: max(24px, env(safe-area-inset-bottom, 24px));
    animation: payFade 0.15s ease;
  }
  .pay-sheet {
    background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
    padding: 22px; width: calc(100% - 32px); max-width: 420px;
    max-height: 82vh; overflow-y: auto; animation: paySlide 0.2s ease;
  }
  @keyframes payFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes paySlide { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .pay-inp {
    width: 100%; background: #111; border: 1px solid #2a2a2a; border-radius: 8px;
    padding: 12px 14px; color: #fff; font-size: 16px; font-family: 'Space Mono', monospace;
    outline: none; box-sizing: border-box; margin-bottom: 12px;
  }
  .pay-lbl { display: block; font-size: 9px; color: #666; letter-spacing: 2px; text-transform: uppercase; font-family: 'Space Mono', monospace; margin-bottom: 6px; }
  .pay-hist-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .pay-hist-row:last-child { border-bottom: none; }
`;

export default function DistribuidorDashboard({ slug }) {
  const [authed, setAuthed]         = useState(() => !!getDistribuidorSession(slug));
  const [role, setRole]             = useState(() => getDistribuidorRole(slug));
  const [inventario, setInventario] = useState([]);
  const [pagos, setPagos]           = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [distribuidor, setDistribuidor] = useState(null);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [showSinStock, setShowSinStock] = useState(false);

  // Pago
  const [paySheet, setPaySheet]     = useState(null); // null | 'menu' | 'parcial' | 'historial'
  const [parcialMonto, setParcialMonto] = useState("");
  const [savingPay, setSavingPay]   = useState(false);
  const [resolviendo, setResolviendo] = useState(null); // id de solicitud en proceso

  // Historial de ventas (sección arriba, PRO)
  const [showHistVentas, setShowHistVentas] = useState(false);
  const [histVentas, setHistVentas]         = useState([]);
  const [histLoading, setHistLoading]       = useState(false);

  const fetchInventario = async () => {
    setLoading(true);
    setError("");
    try {
      // light=1 → sin fotos (base64); cada foto se carga lazy cuando su tarjeta se ve
      const res = await fetch(`/api/distribuidor/inventario?distribuidor=${slug}&light=1`);
      if (!res.ok) throw new Error("Error cargando inventario");
      setInventario(await res.json() || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPagos = async () => {
    try {
      const res = await fetch(`/api/distribuidor/pagos?slug=${slug}`);
      if (res.ok) setPagos(await res.json() || []);
    } catch {}
  };

  const fetchSolicitudes = async () => {
    try {
      const res = await fetch(`/api/distribuidor/solicitudes?slug=${slug}`);
      if (res.ok) setSolicitudes(await res.json() || []);
    } catch {}
  };

  const abrirHistVentas = async () => {
    setShowHistVentas(true);
    setHistLoading(true);
    try {
      const res = await fetch(`/api/distribuidor/historial?distribuidor=${slug}`);
      setHistVentas(res.ok ? (await res.json() || []) : []);
    } catch {
      setHistVentas([]);
    } finally {
      setHistLoading(false);
    }
  };

  const fetchDistribuidor = async () => {
    try {
      const res = await fetch(`/api/distribuidor/auth?slug=${slug}`);
      if (res.ok) setDistribuidor(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (!authed) return;
    fetchDistribuidor();
    fetchInventario();
    fetchPagos();
    fetchSolicitudes();
  }, [slug, authed]);

  if (!authed) {
    return (
      <DistribuidorLogin
        slug={slug}
        onLogin={(data) => {
          setDistribuidor(data);
          setRole(data.role || "basic");
          setAuthed(true);
        }}
      />
    );
  }

  const isAdmin    = role === "admin";
  const modoPrecio = distribuidor?.modo_precio || "venta";

  // Cálculos
  const totalStock    = inventario.reduce((s, i) => s + i.cantidad, 0);
  const totalVendidas = inventario.reduce((s, i) => s + (i.vendidas || 0), 0);
  const totalDebo     = inventario.reduce((s, i) => s + ((i.precio_mayoreo || 0) * (i.vendidas || 0)), 0);
  const totalPagado   = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo         = totalDebo - totalPagado;

  // Filtro de búsqueda
  const q = search.trim().toLowerCase();
  const inventarioFiltrado = q
    ? inventario.filter(i => (i.nombre || "").toLowerCase().includes(q))
    : inventario;
  const conStock = inventarioFiltrado.filter(i => (i.cantidad || 0) > 0);
  const sinStock = inventarioFiltrado.filter(i => (i.cantidad || 0) <= 0);

  // Solicitudes de pago pendientes
  const pendientes     = solicitudes.filter(s => s.estado === "pendiente");
  const totalPendiente = pendientes.reduce((s, x) => s + x.monto, 0);

  // El distribuidor SOLICITA un pago (queda pendiente de aceptación)
  const solicitarPago = async (monto, tipo, notas) => {
    if (!monto || monto <= 0) return;
    setSavingPay(true);
    try {
      const res = await fetch("/api/distribuidor/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, monto, tipo, notas: notas || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error enviando solicitud");
      }
      await fetchSolicitudes();
      setPaySheet(null);
      setParcialMonto("");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSavingPay(false);
    }
  };

  // El PRO acepta / rechaza una solicitud
  const resolverSolicitud = async (id, estado) => {
    setResolviendo(id);
    try {
      const res = await fetch(`/api/distribuidor/solicitudes?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error procesando");
      }
      await Promise.all([fetchSolicitudes(), fetchPagos()]);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setResolviendo(null);
    }
  };

  // ¿Mostramos la sección de saldo? Solo cuando ya hay algo que cobrar o pagos hechos
  const mostrarSaldo = totalDebo > 0 || totalPagado > 0;

  return (
    <div className="dist-wrap">
      <style>{CSS}</style>
      <div className="dist-inner">

        {/* Header */}
        <div className="dist-header">
          <h1 className="dist-title">📦 {distribuidor?.nombre || slug}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p className="dist-sub" style={{ margin: 0 }}>Gestiona tu inventario</p>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", padding: "2px 8px", borderRadius: 5,
              background: isAdmin ? "rgba(255,224,0,0.12)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${isAdmin ? "rgba(255,224,0,0.35)" : "rgba(255,255,255,0.15)"}`,
              color: isAdmin ? "#FFE000" : "#999",
            }}>
              {isAdmin ? "PRO" : "Normal"}
            </span>
          </div>
        </div>

        {/* Stats básicas */}
        <div className="dist-stats">
          <div className="stat-card">
            <p className="stat-label">En Stock</p>
            <p className="stat-value">{totalStock}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Vendidas</p>
            <p className="stat-value">{totalVendidas}</p>
          </div>
        </div>

        {/* Saldo con proveedor — lo primero al entrar, ambos roles */}
        {mostrarSaldo ? (
          <div className={`saldo-card ${saldo > 0 ? "debe" : "ok"}`}>
            <p className="saldo-label">{isAdmin ? "Te deben actualmente" : "Le debes al proveedor"}</p>
            <p className="saldo-monto" style={{ color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>
              {fmt(Math.max(0, saldo))}
              {saldo <= 0 && <span style={{ fontSize: 12, color: "#7ecc7e", marginLeft: 8 }}>✓ Al corriente</span>}
            </p>
            <p className="saldo-sub">
              {totalVendidas} vendidas · {isAdmin ? "Ya te pagaron" : "Ya pagaste"} {fmt(totalPagado)}
            </p>
            {totalPendiente > 0 && (
              <p className="saldo-sub" style={{ color: "#7ec5cc", marginTop: 8 }}>
                ⏳ En revisión: {fmt(totalPendiente)} — {isAdmin ? "acéptalo abajo" : "esperando que el proveedor lo acepte"}
              </p>
            )}
            {!isAdmin && saldo > 0 && pendientes.length === 0 && (
              <button className="pay-btn primary" style={{ width: "100%", marginTop: 14 }} onClick={() => setPaySheet("menu")}>
                💳 Pagar
              </button>
            )}
          </div>
        ) : null}

        {/* Historiales — ambos roles */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={abrirHistVentas}
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 10px", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
            📋 Ventas
          </button>
          <button
            onClick={() => setPaySheet("historial")}
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 10px", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
            🧾 Pagos
          </button>
        </div>

        {/* PRO: solicitudes de pago por aceptar */}
        {isAdmin && pendientes.length > 0 && (
          <div className="corte-card" style={{ borderColor: "rgba(126,197,204,0.35)", background: "rgba(126,197,204,0.05)" }}>
            <p className="corte-title" style={{ color: "#7ec5cc" }}>💳 Pagos por aceptar ({pendientes.length})</p>
            {pendientes.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: "#fff" }}>{fmt(s.monto)}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#666" }}>{s.tipo} · {fmtFecha(s.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={resolviendo === s.id} onClick={() => resolverSolicitud(s.id, "aceptado")}
                    style={{ background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, cursor: "pointer" }}>
                    {resolviendo === s.id ? "..." : "✓ Aceptar"}
                  </button>
                  <button disabled={resolviendo === s.id} onClick={() => resolverSolicitud(s.id, "rechazado")}
                    style={{ background: "#3a1a1a", border: "1px solid #5a2a2a", color: "#ff8080", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: 10, padding: 14, marginBottom: 20, color: "#ff8080",
            fontSize: 13, fontFamily: "'Space Mono', monospace",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Upload Form — solo PRO, sube con precio de mayoreo (como dueño) */}
        {isAdmin && (
          <div style={{ marginBottom: 28 }}>
            <UploadForm slug={slug} onSuccess={fetchInventario} modoPrecio={modoPrecio} asOwner />
          </div>
        )}

        {/* Inventario */}
        <div>
          <h2 className="dist-section-title">Artículos</h2>

          {inventario.length > 0 && (
            <input
              className="dist-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar artículo por nombre..."
            />
          )}

          {loading ? (
            <Loader size={100} message="Cargando artículos" />
          ) : inventario.length === 0 ? (
            <p className="dist-empty">No hay artículos aún.<br />¡Agrega el primero arriba!</p>
          ) : inventarioFiltrado.length === 0 ? (
            <p className="dist-empty">Sin resultados para "{search}".</p>
          ) : (
            <>
              {conStock.length > 0 ? (
                <InventarioTable
                  items={conStock}
                  isAdmin={isAdmin}
                  modoPrecio={modoPrecio}
                  onItemSold={() => { fetchInventario(); }}
                />
              ) : (
                <p className="dist-empty">No hay artículos con stock.</p>
              )}

              {/* Artículos sin stock — sección colapsable (historial de agotados) */}
              {sinStock.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={() => setShowSinStock(v => !v)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", color: "#888", fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSinStock ? 14 : 0 }}>
                    <span>📦 Artículos sin stock ({sinStock.length})</span>
                    <span style={{ color: "#555", fontSize: 18, lineHeight: 1 }}>{showSinStock ? "−" : "+"}</span>
                  </button>
                  {showSinStock && (
                    <InventarioTable
                      items={sinStock}
                      isAdmin={isAdmin}
                      modoPrecio={modoPrecio}
                      onItemSold={() => { fetchInventario(); }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* ── Sheet: menú de pago (total / parcial) ── */}
      {paySheet === "menu" && (
        <div className="pay-overlay" onClick={() => setPaySheet(null)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💳 Pagar al proveedor
            </p>
            <p style={{ margin: "0 0 14px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              Saldo pendiente: <span style={{ color: "#FFE000" }}>{fmt(saldo)}</span>
            </p>
            <p style={{ margin: "0 0 18px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#7ec5cc" }}>
              ⏳ Tu pago quedará en revisión hasta que el proveedor lo acepte.
            </p>

            <button
              className="pay-btn"
              style={{ background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", marginBottom: 10 }}
              disabled={savingPay || saldo <= 0}
              onClick={() => solicitarPago(saldo, "completo", null)}
            >
              {savingPay ? "Enviando..." : `Pagar todo (${fmt(saldo)})`}
            </button>

            <button
              className="pay-btn"
              style={{ background: "#1a2a3a", border: "1px solid #2a4a5a", color: "#7ec5cc", marginBottom: 10, fontFamily: "'Space Mono', monospace", fontSize: 13 }}
              disabled={savingPay}
              onClick={() => { setParcialMonto(""); setPaySheet("parcial"); }}
            >
              Pagar una parte
            </button>

            <button
              className="pay-btn ghost"
              onClick={() => setPaySheet(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Sheet: pago parcial ── */}
      {paySheet === "parcial" && (
        <div className="pay-overlay" onClick={() => setPaySheet(null)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💸 Pagar una parte
            </p>
            <p style={{ margin: "0 0 20px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              Saldo pendiente: <span style={{ color: "#FFE000" }}>{fmt(saldo)}</span>
            </p>

            <label className="pay-lbl">Monto a pagar $</label>
            <input
              className="pay-inp" type="number" inputMode="decimal" step="0.01" min="1"
              value={parcialMonto} onChange={e => setParcialMonto(e.target.value)}
              placeholder="Ej: 500" autoFocus
            />

            {parcialMonto && parseFloat(parcialMonto) > 0 && (
              <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", textAlign: "center" }}>
                Te quedará pendiente:{" "}
                <strong style={{ color: saldo - parseFloat(parcialMonto) <= 0 ? "#7ecc7e" : "#FFE000" }}>
                  {fmt(Math.max(0, saldo - parseFloat(parcialMonto)))}
                </strong>
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="pay-btn ghost" style={{ flex: 1 }}
                onClick={() => { setPaySheet("menu"); setParcialMonto(""); }}>
                ← Volver
              </button>
              <button className="pay-btn primary" style={{ flex: 2 }}
                disabled={savingPay || !parcialMonto || parseFloat(parcialMonto) <= 0}
                onClick={() => solicitarPago(parseFloat(parcialMonto), "parcial", null)}>
                {savingPay ? "Enviando..." : "✓ Enviar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: historial de mis pagos ── */}
      {paySheet === "historial" && (
        <div className="pay-overlay" onClick={() => setPaySheet(null)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                🧾 Mis pagos
              </p>
              <button onClick={() => setPaySheet(null)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <p className="pay-lbl" style={{ marginBottom: 4 }}>Total pagado</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#7ecc7e" }}>{fmt(totalPagado)}</p>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <p className="pay-lbl" style={{ marginBottom: 4 }}>Saldo</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>{fmt(Math.max(0, saldo))}</p>
              </div>
            </div>

            {pendientes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p className="pay-lbl" style={{ marginBottom: 8 }}>En revisión</p>
                {pendientes.map(s => (
                  <div key={s.id} className="pay-hist-row">
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666", marginBottom: 2 }}>{fmtFecha(s.created_at)}</div>
                      <span style={{ background: "rgba(126,197,204,0.12)", border: "1px solid rgba(126,197,204,0.3)", color: "#7ec5cc", borderRadius: 4, padding: "1px 7px", fontSize: 9, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
                        ⏳ pendiente
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: "#7ec5cc" }}>{fmt(s.monto)}</span>
                  </div>
                ))}
              </div>
            )}

            {pagos.length === 0 ? (
              <p style={{ textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Aún no has registrado pagos
              </p>
            ) : (
              pagos.map(p => (
                <div key={p.id} className="pay-hist-row">
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666", marginBottom: 2 }}>
                      {fmtFecha(p.created_at)}
                    </div>
                    <span style={{
                      background: p.tipo === "completo" ? "rgba(126,204,126,0.12)" : "rgba(126,197,204,0.12)",
                      border: `1px solid ${p.tipo === "completo" ? "rgba(126,204,126,0.3)" : "rgba(126,197,204,0.3)"}`,
                      color: p.tipo === "completo" ? "#7ecc7e" : "#7ec5cc",
                      borderRadius: 4, padding: "1px 7px",
                      fontSize: 9, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1,
                    }}>
                      {p.tipo}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: "#7ecc7e" }}>
                    {fmt(p.monto)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Sheet: historial de ventas (PRO) ── */}
      {showHistVentas && (
        <div className="pay-overlay" onClick={() => setShowHistVentas(false)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                📋 Historial de ventas
              </p>
              <button onClick={() => setShowHistVentas(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {histLoading ? (
              <Loader size={80} message="Cargando historial" />
            ) : histVentas.length === 0 ? (
              <p style={{ textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Sin ventas registradas aún
              </p>
            ) : (
              <>
                <div style={{ background: "rgba(0,200,100,0.06)", border: "1px solid rgba(0,200,100,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666" }}>Total mayoreo</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: "#7ecc7e" }}>
                    {histVentas.reduce((s, v) => s + v.cantidad, 0)} uds · {fmt(histVentas.reduce((s, v) => {
                      const it = inventario.find(i => i.id === v.item_id);
                      return s + ((it?.precio_mayoreo || 0) * v.cantidad);
                    }, 0))}
                  </span>
                </div>
                {histVentas.map(v => {
                  const item = inventario.find(i => i.id === v.item_id);
                  const mayoreo = item?.precio_mayoreo || 0;
                  return (
                    <div key={v.id} className="pay-hist-row">
                      <div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#fff", marginBottom: 2 }}>
                          {item?.nombre || "Artículo"}
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#666" }}>
                          {fmtFecha(v.created_at)} · x{v.cantidad}
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: "#7ecc7e" }}>
                        {mayoreo > 0 ? fmt(mayoreo * v.cantidad) : "—"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
