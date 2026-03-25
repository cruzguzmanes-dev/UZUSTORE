import React, { useState, useEffect } from "react";
import { fmt } from "../utils";

const SLUGS = ["gaticueva", "friki"];
const NOMBRES = { gaticueva: "Gaticueva", friki: "Friki" };
const COLORS  = { gaticueva: "#00C9FF", friki: "#FF6B9D" };

export default function Distribuidores() {
  const [data, setData] = useState({ gaticueva: [], friki: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("gaticueva");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        SLUGS.map(s => fetch(`/api/distribuidor/inventario?distribuidor=${s}`).then(r => r.ok ? r.json() : []))
      );
      setData({ gaticueva: results[0] || [], friki: results[1] || [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const setMayoreo = async (id, valor) => {
    await fetch(`/api/distribuidor/inventario?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio_mayoreo: parseFloat(valor) || 0 }),
    });
    fetchAll();
  };

  // Resumen total de lo que te deben
  const resumen = SLUGS.map(slug => {
    const items = data[slug] || [];
    const vendidas    = items.reduce((s, i) => s + (i.vendidas || 0), 0);
    const totalVentas = items.reduce((s, i) => s + (i.precio_venta * (i.vendidas || 0)), 0);
    const teDeben     = items.reduce((s, i) => s + ((i.precio_mayoreo || 0) * (i.vendidas || 0)), 0);
    const ganancia    = totalVentas - teDeben;
    const stock       = items.reduce((s, i) => s + i.cantidad, 0);
    return { slug, vendidas, totalVentas, teDeben, ganancia, stock, items };
  });

  const totalTeDeben = resumen.reduce((s, r) => s + r.teDeben, 0);

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

      {/* Resumen cobrar */}
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
            <p style={{ margin: "0 0 2px 0", fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: COLORS[r.slug] }}>
              {fmt(r.teDeben)}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
              {r.vendidas} vendidas
            </p>
          </div>
        ))}
        <div style={{ textAlign: "center", gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
            Total a cobrar
          </p>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>
            {fmt(totalTeDeben)}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: 14, marginBottom: 20, color: "#ff8080", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Tabs por distribuidor */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {SLUGS.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "1px solid",
              borderColor: tab === s ? COLORS[s] : "#2a2a2a",
              background: tab === s ? `${COLORS[s]}18` : "transparent",
              color: tab === s ? COLORS[s] : "#666",
              fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
            }}
          >
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
          onSetMayoreo={setMayoreo}
        />
      )}
    </div>
  );
}

function DistribuidorDetalle({ slug, items, resumen, color, onSetMayoreo }) {
  return (
    <div>
      {/* Corte de este distribuidor */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${color}33`,
        borderRadius: 14, padding: 18, marginBottom: 24,
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
      }}>
        <CorteItem label="En stock" value={resumen.stock} />
        <CorteItem label="Vendidas" value={resumen.vendidas} />
        <CorteItem label="Sus ventas totales" value={fmt(resumen.totalVentas)} />
        <CorteItem label="Te deben" value={fmt(resumen.teDeben)} highlight />
        <CorteItem label="Su ganancia" value={fmt(resumen.ganancia)} style={{ gridColumn: "1 / -1" }} />
      </div>

      {/* Lista de artículos con mayoreo editable */}
      {items.length === 0 ? (
        <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          Sin artículos aún
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} color={color} onSetMayoreo={onSetMayoreo} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, color, onSetMayoreo }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(item.precio_mayoreo || "");

  const vendidas = item.vendidas || 0;
  const mayoreo  = item.precio_mayoreo || 0;
  const teDebe   = mayoreo * vendidas;
  const ganancia = (item.precio_venta - mayoreo) * vendidas;

  const guardar = () => {
    onSetMayoreo(item.id, val);
    setEditando(false);
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {/* Foto */}
      {item.foto_url
        ? <img src={item.foto_url} alt={item.nombre} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 22, flexShrink: 0 }}>📦</div>
      }

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.nombre || "Sin nombre"}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
          <span style={{ color: color }}>Precio: {fmt(item.precio_venta)}</span>
          <span style={{ color: "#888" }}>Stock: {item.cantidad}</span>
          <span style={{ color: "#aaa" }}>Vendidas: {vendidas}</span>
        </div>

        {/* Mayoreo editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: vendidas > 0 ? 8 : 0 }}>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
            Mayoreo:
          </span>
          {editando ? (
            <>
              <input
                type="number"
                value={val}
                onChange={e => setVal(e.target.value)}
                step="0.01"
                autoFocus
                style={{
                  width: 90, background: "#111", border: "1px solid #444", borderRadius: 6,
                  padding: "4px 8px", color: "#fff", fontSize: 13,
                  fontFamily: "'Space Mono', monospace", outline: "none",
                }}
              />
              <button onClick={guardar} style={{ background: "#FFE000", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
              <button onClick={() => setEditando(false)} style={{ background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer" }}>✕</button>
            </>
          ) : (
            <>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: mayoreo > 0 ? "#fff" : "#555" }}>
                {mayoreo > 0 ? fmt(mayoreo) : "—"}
              </span>
              <button
                onClick={() => setEditando(true)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#aaa", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
              >
                editar
              </button>
            </>
          )}
        </div>

        {/* Resumen si hay vendidas */}
        {vendidas > 0 && mayoreo > 0 && (
          <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
            <span style={{ color: "#ff8080" }}>Te debe: {fmt(teDebe)}</span>
            <span style={{ color: "#7ecc7e" }}>Su gan.: {fmt(ganancia)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CorteItem({ label, value, highlight, style }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, textAlign: "center", ...style }}>
      <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: highlight ? "#FFE000" : "#fff" }}>
        {value}
      </p>
    </div>
  );
}
