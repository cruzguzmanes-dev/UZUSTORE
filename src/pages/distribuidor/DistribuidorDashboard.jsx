import React, { useState, useEffect } from "react";
import { fmt } from "../../utils";
import { GS } from "../../constants";
import UploadForm from "./UploadForm";
import InventarioTable from "./InventarioTable";
import DistribuidorLogin, { getDistribuidorSession, getDistribuidorRole } from "./DistribuidorLogin";

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
  .corte-card {
    background: rgba(255,224,0,0.04);
    border: 1px solid rgba(255,224,0,0.15);
    border-radius: 14px; padding: 18px; margin-bottom: 20px;
  }
  .corte-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: #FFE000; margin: 0 0 14px 0; }
  .corte-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .corte-row:last-child { border-bottom: none; }
  .corte-label { font-family: 'Space Mono', monospace; font-size: 11px; color: #888; }
  .corte-val { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: #fff; }
  .corte-val.green { color: #7ecc7e; }
  .corte-val.red { color: #ff8080; }
  .corte-pending { font-family: 'Space Mono', monospace; font-size: 11px; color: #555; font-style: italic; }
  .dist-section-title { font-size: 16px; font-weight: 700; margin: 0 0 14px 0; font-family: 'Syne', sans-serif; color: #fff; }
  .dist-empty { color: #555; font-family: 'Space Mono', monospace; font-size: 13px; text-align: center; padding: 32px 0; }
`;

export default function DistribuidorDashboard({ slug }) {
  const [authed, setAuthed]         = useState(() => !!getDistribuidorSession(slug));
  const [role, setRole]             = useState(() => getDistribuidorRole(slug));
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [distribuidor, setDistribuidor] = useState(null);
  const [error, setError]           = useState("");

  const fetchInventario = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/distribuidor/inventario?distribuidor=${slug}`);
      if (!res.ok) throw new Error("Error cargando inventario");
      setInventario(await res.json() || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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

  const isAdmin = role === "admin";

  // Cálculos
  const totalStock    = inventario.reduce((s, i) => s + i.cantidad, 0);
  const totalVendidas = inventario.reduce((s, i) => s + (i.vendidas || 0), 0);
  const totalVentas   = inventario.reduce((s, i) => s + (i.precio_venta * (i.vendidas || 0)), 0);
  const mayoreoSet    = inventario.some(i => (i.precio_mayoreo || 0) > 0);
  const totalDebo     = inventario.reduce((s, i) => s + ((i.precio_mayoreo || 0) * (i.vendidas || 0)), 0);
  const totalGanancia = totalVentas - totalDebo;

  return (
    <div className="dist-wrap">
      <style>{CSS}</style>
      <div className="dist-inner">

        {/* Header */}
        <div className="dist-header">
          <h1 className="dist-title">📦 {distribuidor?.nombre || slug}</h1>
          <p className="dist-sub">Gestiona tu inventario</p>
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

        {/* Corte — solo para admin y si hay vendidas */}
        {isAdmin && totalVendidas > 0 && (
          <div className="corte-card">
            <p className="corte-title">📊 Mi Corte</p>

            <div className="corte-row">
              <span className="corte-label">Total ventas</span>
              <span className="corte-val">{fmt(totalVentas)}</span>
            </div>

            {mayoreoSet ? (
              <>
                <div className="corte-row">
                  <span className="corte-label">Saldo al proveedor</span>
                  <span className="corte-val red">{fmt(totalDebo)}</span>
                </div>
                <div className="corte-row">
                  <span className="corte-label">Mi ganancia neta</span>
                  <span className="corte-val green">{fmt(totalGanancia)}</span>
                </div>
              </>
            ) : (
              <div className="corte-row">
                <span className="corte-pending">El proveedor aún no ha configurado tu precio. Pronto verás tu ganancia aquí.</span>
              </div>
            )}
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

        {/* Upload Form */}
        <div style={{ marginBottom: 28 }}>
          <UploadForm slug={slug} onSuccess={fetchInventario} />
        </div>

        {/* Inventario */}
        <div>
          <h2 className="dist-section-title">Artículos</h2>
          {loading ? (
            <p className="dist-empty">Cargando...</p>
          ) : inventario.length === 0 ? (
            <p className="dist-empty">No hay artículos aún.<br />¡Agrega el primero arriba!</p>
          ) : (
            <InventarioTable
              items={inventario}
              isAdmin={isAdmin}
              onItemDeleted={fetchInventario}
              onItemSold={fetchInventario}
            />
          )}
        </div>

      </div>
    </div>
  );
}
