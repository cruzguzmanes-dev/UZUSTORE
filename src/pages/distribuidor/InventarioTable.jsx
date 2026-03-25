import React, { useState } from "react";
import { fmt } from "../../utils";

const CSS = `
  .inv-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 600px) { .inv-grid { grid-template-columns: 1fr 1fr; } }
  .inv-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .inv-img {
    width: 72px; height: 72px; flex-shrink: 0;
    border-radius: 10px; object-fit: cover; background: #1a1a1a;
  }
  .inv-img-placeholder {
    width: 72px; height: 72px; flex-shrink: 0;
    border-radius: 10px; background: #1a1a1a;
    display: flex; align-items: center; justify-content: center;
    color: #444; font-size: 26px;
  }
  .inv-info { flex: 1; min-width: 0; }
  .inv-name {
    font-family: 'Syne', sans-serif; font-weight: 700;
    font-size: 15px; color: #fff; margin-bottom: 6px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .inv-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
  .inv-precio { color: #FFE000; font-weight: 700; font-family: 'Space Mono', monospace; font-size: 13px; }
  .inv-badge {
    background: rgba(255,255,255,0.07);
    border-radius: 6px; padding: 3px 10px;
    font-family: 'Space Mono', monospace; font-size: 11px;
    color: #aaa;
  }
  .inv-badge strong { color: #fff; }
  .inv-ganancia {
    background: rgba(0,200,100,0.08);
    border: 1px solid rgba(0,200,100,0.2);
    border-radius: 8px; padding: 6px 10px; margin-bottom: 8px;
    font-family: 'Space Mono', monospace; font-size: 11px; color: #7ecc7e;
  }
  .inv-actions { display: flex; gap: 8px; }
  .inv-btn-sell {
    flex: 1;
    background: #1e3a1e; border: 1px solid #2d5a2d;
    color: #7ecc7e; border-radius: 8px; padding: 8px 0;
    font-size: 12px; font-family: 'Space Mono', monospace;
    cursor: pointer; font-weight: 700;
  }
  .inv-btn-sell:disabled { background: #1a1a1a; border-color: #222; color: #444; cursor: not-allowed; }
  .inv-btn-delete {
    background: #2a1a1a; border: 1px solid #4a2a2a;
    color: #ff8080; border-radius: 8px; padding: 8px 14px;
    font-size: 14px; font-family: 'Space Mono', monospace; cursor: pointer;
  }
`;

export default function InventarioTable({ items, onItemDeleted, onItemSold }) {
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
    if (cantidad <= 0) { alert("No hay stock disponible"); return; }
    setSellingId(id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: cantidad - 1, vendidas: (vendidas || 0) + 1 }),
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
    <>
      <style>{CSS}</style>
      <div className="inv-grid">
        {items.map((item) => {
          const vendidas = item.vendidas || 0;
          const mayoreo = item.precio_mayoreo || 0;
          const gananciaTotal = vendidas > 0 && mayoreo > 0
            ? (item.precio_venta - mayoreo) * vendidas
            : null;

          return (
            <div key={item.id} className="inv-card">
              {item.foto_url
                ? <img src={item.foto_url} alt={item.nombre} className="inv-img" />
                : <div className="inv-img-placeholder">📦</div>
              }
              <div className="inv-info">
                <div className="inv-name">{item.nombre || "Sin nombre"}</div>
                <div className="inv-row">
                  <span className="inv-precio">{fmt(item.precio_venta)}</span>
                  <div className="inv-badge">Stock <strong>{item.cantidad}</strong></div>
                  <div className="inv-badge">Vendidas <strong>{vendidas}</strong></div>
                </div>

                {/* Ganancia acumulada (solo si el dueño ya puso el mayoreo) */}
                {gananciaTotal !== null && (
                  <div className="inv-ganancia">
                    Ganancia acumulada: <strong>{fmt(gananciaTotal)}</strong>
                  </div>
                )}

                <div className="inv-actions">
                  <button
                    className="inv-btn-sell"
                    onClick={() => handleMarkSold(item.id, item.cantidad, item.vendidas)}
                    disabled={item.cantidad <= 0 || sellingId === item.id}
                  >
                    {sellingId === item.id ? "..." : "✓ Vendido"}
                  </button>
                  <button
                    className="inv-btn-delete"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "..." : "✕"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
