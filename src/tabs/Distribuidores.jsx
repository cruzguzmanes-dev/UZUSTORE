import React, { useState, useEffect } from "react";
import { fmt } from "../utils";

export default function Distribuidores({ lotes }) {
  const [distribuidores, setDistribuidores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar inventario de distribuidores
  useEffect(() => {
    const fetchDistribuidores = async () => {
      setLoading(true);
      setError("");
      try {
        const gatiRes = await fetch("/api/distribuidor/inventario?distribuidor=gaticueva");
        const gatiData = gatiRes.ok ? await gatiRes.json() : [];

        const frikRes = await fetch("/api/distribuidor/inventario?distribuidor=friki");
        const frikData = frikRes.ok ? await frikRes.json() : [];

        setDistribuidores({
          gaticueva: gatiData || [],
          friki: frikData || [],
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDistribuidores();
  }, []);

  // Consolidar datos: agrupar por nombre/SKU
  const consolidatedInventory = {};

  // Agregar MercadoLibre (lotes)
  (lotes || []).forEach((lote) => {
    const key = lote.sku || lote.titulo;
    if (!consolidatedInventory[key]) {
      consolidatedInventory[key] = {
        nombre: lote.titulo || lote.sku,
        sku: lote.sku,
        ml: lote.cantidad_disponible || 0,
        gaticueva: 0,
        friki: 0,
        costoML: lote.costo_unitario || 0,
      };
    }
    consolidatedInventory[key].ml = lote.cantidad_disponible || 0;
    consolidatedInventory[key].costoML = lote.costo_unitario || 0;
  });

  // Agregar Gaticueva
  (distribuidores.gaticueva || []).forEach((item) => {
    const key = item.sku || item.nombre || `gati-${item.id}`;
    if (!consolidatedInventory[key]) {
      consolidatedInventory[key] = {
        nombre: item.nombre || item.sku || "—",
        sku: item.sku,
        ml: 0,
        gaticueva: 0,
        friki: 0,
        costoML: 0,
      };
    }
    consolidatedInventory[key].gaticueva = item.cantidad || 0;
  });

  // Agregar Friki
  (distribuidores.friki || []).forEach((item) => {
    const key = item.sku || item.nombre || `friki-${item.id}`;
    if (!consolidatedInventory[key]) {
      consolidatedInventory[key] = {
        nombre: item.nombre || item.sku || "—",
        sku: item.sku,
        ml: 0,
        gaticueva: 0,
        friki: 0,
        costoML: 0,
      };
    }
    consolidatedInventory[key].friki = item.cantidad || 0;
  });

  const items = Object.values(consolidatedInventory);
  const totalML = items.reduce((sum, i) => sum + i.ml, 0);
  const totalGati = items.reduce((sum, i) => sum + i.gaticueva, 0);
  const totalFriki = items.reduce((sum, i) => sum + i.friki, 0);
  const totalGeneral = totalML + totalGati + totalFriki;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0", fontFamily: "'Syne', sans-serif" }}>
          🏪 Multi-Inventario
        </h2>
        <p style={{ color: "#888", margin: 0, fontSize: 13 }}>
          Vista consolidada de MercadoLibre, Gaticueva y Friki
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="MercadoLibre" value={totalML} color="#FFE000" />
        <StatCard label="Gaticueva" value={totalGati} color="#00C9FF" />
        <StatCard label="Friki" value={totalFriki} color="#FF6B9D" />
        <StatCard label="Total" value={totalGeneral} color="#fff" />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255, 80, 80, 0.1)",
          border: "1px solid rgba(255, 80, 80, 0.3)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          color: "#ff8080",
          fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <p style={{ color: "#666" }}>Cargando distribuidores...</p>
      ) : (
        <>
          {/* Tabla consolidada */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            overflow: "auto",
            marginBottom: 32,
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0,0,0,0.3)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Producto</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: "#FFE000", fontWeight: 500 }}>ML</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: "#00C9FF", fontWeight: 500 }}>Gaticueva</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: "#FF6B9D", fontWeight: 500 }}>Friki</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: "#aaa", fontWeight: 500 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                      No hay inventario en ningún canal
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px 16px", color: "#fff" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.nombre}</div>
                        {item.sku && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{item.sku}</div>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#FFE000", fontWeight: 600 }}>
                        {item.ml}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#00C9FF", fontWeight: 600 }}>
                        {item.gaticueva}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#FF6B9D", fontWeight: 600 }}>
                        {item.friki}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#aaa", fontWeight: 600 }}>
                        {item.ml + item.gaticueva + item.friki}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Reportes por distribuidor */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            <ReporteDistribuidor title="Gaticueva" slug="gaticueva" items={distribuidores.gaticueva || []} />
            <ReporteDistribuidor title="Friki" slug="friki" items={distribuidores.friki || []} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 12,
      padding: 16,
      textAlign: "center",
    }}>
      <p style={{ margin: "0 0 8px 0", color: "#888", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color }}>
        {value}
      </p>
    </div>
  );
}

function ReporteDistribuidor({ title, slug, items }) {
  const totalStock = items.reduce((sum, i) => sum + (i.cantidad || 0), 0);
  const totalVendidas = items.reduce((sum, i) => sum + (i.vendidas || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.precio_venta * i.cantidad), 0);
  const totalCosto = items.reduce((sum, i) => sum + (i.costo_unitario * i.cantidad), 0);
  const ganancia = totalValue - totalCosto;

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <ReporteStat label="En stock" value={totalStock} />
        <ReporteStat label="Vendidas" value={totalVendidas} />
        <ReporteStat label="Valor Total" value={fmt(totalValue)} />
        <ReporteStat label="Ganancia Neta" value={fmt(ganancia)} highlight={ganancia > 0} />
      </div>
      <a
        href={`/distribuidor/${slug}`}
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "8px 16px",
          background: "rgba(255, 224, 0, 0.1)",
          border: "1px solid rgba(255, 224, 0, 0.3)",
          borderRadius: 8,
          color: "#FFE000",
          textDecoration: "none",
          fontSize: 12,
          fontFamily: "'Space Mono', monospace",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 224, 0, 0.2)";
          e.target.style.borderColor = "rgba(255, 224, 0, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255, 224, 0, 0.1)";
          e.target.style.borderColor = "rgba(255, 224, 0, 0.3)";
        }}
      >
        Ver inventario →
      </a>
    </div>
  );
}

function ReporteStat({ label, value, highlight }) {
  return (
    <div style={{
      background: "rgba(0, 0, 0, 0.3)",
      borderRadius: 8,
      padding: 12,
      textAlign: "center",
    }}>
      <p style={{ margin: "0 0 6px 0", color: "#888", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "'Space Mono', monospace",
        color: highlight ? "#00FF00" : "#fff",
      }}>
        {value}
      </p>
    </div>
  );
}
