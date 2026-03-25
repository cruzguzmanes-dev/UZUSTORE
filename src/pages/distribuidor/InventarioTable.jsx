import React, { useState } from "react";
import { fmt } from "../../utils";

export default function InventarioTable({ items, onItemDeleted, onItemSold, slug }) {
  const [deletingId, setDeletingId] = useState(null);
  const [sellingId, setSellingId] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este artículo?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error eliminando");
      onItemDeleted();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkSold = async (id, cantidad, vendidas) => {
    if (cantidad <= 0) {
      alert("No hay stock disponible");
      return;
    }
    setSellingId(id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cantidad: cantidad - 1,
          vendidas: (vendidas || 0) + 1,
        }),
      });
      if (!res.ok) throw new Error("Error marcando vendido");
      onItemSold();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSellingId(null);
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
        fontFamily: "'Space Mono', monospace",
      }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Foto</th>
            <th style={{ textAlign: "left", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Nombre</th>
            <th style={{ textAlign: "right", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Costo</th>
            <th style={{ textAlign: "right", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Tu Precio</th>
            <th style={{ textAlign: "center", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Stock</th>
            <th style={{ textAlign: "center", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Vendidas</th>
            <th style={{ textAlign: "center", padding: "12px 16px", color: "#888", fontWeight: 500 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
              {/* Foto */}
              <td style={{ padding: "12px 16px" }}>
                {item.foto_url ? (
                  <img
                    src={item.foto_url}
                    alt={item.nombre}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      objectFit: "cover",
                      background: "#222",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    background: "#222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                    fontSize: 20,
                  }}>
                    —
                  </div>
                )}
              </td>
              {/* Nombre */}
              <td style={{ padding: "12px 16px", color: "#fff" }}>
                {item.nombre || "—"}
              </td>
              {/* Costo */}
              <td style={{ padding: "12px 16px", textAlign: "right", color: "#aaa" }}>
                {fmt(item.costo_unitario)}
              </td>
              {/* Precio */}
              <td style={{ padding: "12px 16px", textAlign: "right", color: "#FFE000", fontWeight: 600 }}>
                {fmt(item.precio_venta)}
              </td>
              {/* Stock */}
              <td style={{ padding: "12px 16px", textAlign: "center", color: "#fff", fontWeight: 600 }}>
                {item.cantidad}
              </td>
              {/* Vendidas */}
              <td style={{ padding: "12px 16px", textAlign: "center", color: "#888" }}>
                {item.vendidas || 0}
              </td>
              {/* Acciones */}
              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button
                    onClick={() => handleMarkSold(item.id, item.cantidad, item.vendidas)}
                    disabled={item.cantidad <= 0 || sellingId === item.id}
                    style={{
                      background: item.cantidad > 0 ? "#333" : "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      color: item.cantidad > 0 ? "#fff" : "#666",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                      cursor: item.cantidad > 0 ? "pointer" : "not-allowed",
                    }}
                    title="Marcar como vendido"
                  >
                    {sellingId === item.id ? "..." : "✓ Vendido"}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={{
                      background: "#333",
                      border: "1px solid #2a2a2a",
                      color: "#ff8080",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer",
                    }}
                  >
                    {deletingId === item.id ? "..." : "✕"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
