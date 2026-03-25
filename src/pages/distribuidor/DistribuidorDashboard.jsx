import React, { useState, useEffect } from "react";
import { fmt } from "../../utils";
import UploadForm from "./UploadForm";
import InventarioTable from "./InventarioTable";
import DistribuidorLogin, { getDistribuidorSession } from "./DistribuidorLogin";

export default function DistribuidorDashboard({ slug }) {
  const [authed, setAuthed] = useState(() => !!getDistribuidorSession(slug));
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distribuidor, setDistribuidor] = useState(null);
  const [error, setError] = useState("");

  if (!authed) {
    return <DistribuidorLogin slug={slug} onLogin={(data) => { setDistribuidor(data); setAuthed(true); }} />;
  }

  // Cargar inventario del distribuidor
  const fetchInventario = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/distribuidor/inventario?distribuidor=${slug}`);
      if (!res.ok) throw new Error("Error cargando inventario");
      const data = await res.json();
      setInventario(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar info del distribuidor
  const fetchDistribuidor = async () => {
    try {
      const res = await fetch(`/api/distribuidor/auth?slug=${slug}`);
      if (!res.ok) throw new Error("Distribuidor no encontrado");
      const data = await res.json();
      setDistribuidor(data);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchDistribuidor();
    fetchInventario();
  }, [slug]);

  const handleItemDeleted = () => {
    fetchInventario();
  };

  const handleItemAdded = () => {
    fetchInventario();
  };

  const handleItemSold = () => {
    fetchInventario();
  };

  const totalInventario = inventario.reduce((sum, item) => sum + item.cantidad, 0);
  const totalVendidas = inventario.reduce((sum, item) => sum + (item.vendidas || 0), 0);
  const totalValue = inventario.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px 0", fontFamily: "'Syne', sans-serif" }}>
            📦 Inventario — {distribuidor?.nombre || slug}
          </h1>
          <p style={{ color: "#888", margin: 0, fontSize: 14 }}>
            Gestiona tu inventario de figuras
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <StatCard label="En Stock" value={totalInventario} />
          <StatCard label="Vendidas" value={totalVendidas} />
          <StatCard label="Valor Total" value={fmt(totalValue)} />
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
            fontSize: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Upload Form */}
        <div style={{ marginBottom: 32 }}>
          <UploadForm slug={slug} onSuccess={handleItemAdded} />
        </div>

        {/* Inventory Table */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>
            Artículos
          </h2>
          {loading ? (
            <p style={{ color: "#666" }}>Cargando...</p>
          ) : inventario.length === 0 ? (
            <p style={{ color: "#666" }}>No hay artículos aún. ¡Agrega uno!</p>
          ) : (
            <InventarioTable
              items={inventario}
              onItemDeleted={handleItemDeleted}
              onItemSold={handleItemSold}
              slug={slug}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 12,
      padding: 20,
      textAlign: "center",
    }}>
      <p style={{ margin: "0 0 8px 0", color: "#888", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
        {value}
      </p>
    </div>
  );
}
