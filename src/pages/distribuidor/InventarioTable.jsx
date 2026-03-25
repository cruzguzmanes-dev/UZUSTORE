import React, { useState } from "react";
import { fmt } from "../../utils";

const CSS = `
  .inv-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 600px) { .inv-grid { grid-template-columns: 1fr 1fr; } }
  .confirm-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: max(24px, env(safe-area-inset-bottom, 24px));
    animation: fadeIn 0.15s ease;
  }
  .confirm-sheet {
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 20px;
    width: calc(100% - 32px);
    max-width: 420px;
    animation: slideUp 0.2s ease;
  }
  .confirm-foto {
    width: 56px; height: 56px; border-radius: 10px;
    object-fit: cover; flex-shrink: 0;
  }
  .confirm-foto-placeholder {
    width: 56px; height: 56px; border-radius: 10px;
    background: #2a2a2a; display: flex; align-items: center;
    justify-content: center; font-size: 22px; flex-shrink: 0;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
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
  .inv-btn-gear {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #666; border-radius: 8px; padding: 5px 8px;
    font-size: 14px; cursor: pointer; line-height: 1;
  }
  .inv-btn-gear:hover { background: rgba(255,255,255,0.12); color: #aaa; }
  .edit-inp {
    width: 100%; background: #111; border: 1px solid #2a2a2a;
    border-radius: 8px; padding: 11px 14px; color: #fff;
    font-size: 16px; font-family: 'Space Mono', monospace;
    outline: none; box-sizing: border-box; margin-bottom: 12px;
  }
  .edit-lbl {
    display: block; font-size: 9px; color: #666; letter-spacing: 2px;
    text-transform: uppercase; font-family: 'Space Mono', monospace; margin-bottom: 6px;
  }
`;

export default function InventarioTable({ items, onItemDeleted, onItemSold }) {
  const [deletingId, setDeletingId]   = useState(null);
  const [sellingId, setSellingId]     = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [editItem, setEditItem]       = useState(null);
  const [editNombre, setEditNombre]   = useState("");
  const [editPrecio, setEditPrecio]   = useState("");
  const [saving, setSaving]           = useState(false);

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

  const confirmSell = (item) => {
    if (item.cantidad <= 0) return;
    setConfirmItem(item);
  };

  const openEdit = (item) => {
    setEditNombre(item.nombre || "");
    setEditPrecio(item.precio_venta || "");
    setEditItem(item);
  };

  const handleSaveEdit = async () => {
    if (!editPrecio) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editNombre || null,
          precio_venta: parseFloat(editPrecio),
        }),
      });
      if (!res.ok) throw new Error("Error guardando");
      setEditItem(null);
      onItemSold(); // refresca el inventario
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSold = async () => {
    const item = confirmItem;
    setConfirmItem(null);
    if (!item) return;
    setSellingId(item.id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: item.cantidad - 1, vendidas: (item.vendidas || 0) + 1 }),
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

      {/* Confirmación de venta */}
      {confirmItem && (
        <div className="confirm-overlay" onClick={() => setConfirmItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            {/* Item info */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
              {confirmItem.foto_url
                ? <img src={confirmItem.foto_url} alt="" className="confirm-foto" />
                : <div className="confirm-foto-placeholder">📦</div>
              }
              <div>
                <p style={{ margin: "0 0 4px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                  {confirmItem.nombre || "Sin nombre"}
                </p>
                <p style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>
                  Precio: <span style={{ color: "#FFE000" }}>{fmt(confirmItem.precio_venta)}</span>
                  &nbsp;· Stock: {confirmItem.cantidad}
                </p>
              </div>
            </div>

            <p style={{ margin: "0 0 18px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666", textAlign: "center" }}>
              ¿Confirmas que esta figura se vendió?
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmItem(null)}
                style={{
                  flex: 1, background: "#222", border: "1px solid #333",
                  color: "#888", borderRadius: 12, padding: 14,
                  fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkSold}
                style={{
                  flex: 2, background: "#1e3a1e", border: "1px solid #2d5a2d",
                  color: "#7ecc7e", borderRadius: 12, padding: 14,
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                ✓ Sí, se vendió
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet de edición */}
      {editItem && (
        <div className="confirm-overlay" onClick={() => setEditItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 18px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
              ⚙ Editar artículo
            </p>
            <label className="edit-lbl">Nombre</label>
            <input
              className="edit-inp"
              type="text"
              value={editNombre}
              onChange={e => setEditNombre(e.target.value)}
              placeholder="Ej: Goku Ultra Instinct"
            />
            <label className="edit-lbl">Tu Precio de Venta $</label>
            <input
              className="edit-inp"
              type="number"
              step="0.01"
              value={editPrecio}
              onChange={e => setEditPrecio(e.target.value)}
              placeholder="Ej: 650"
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setEditItem(null)}
                style={{
                  flex: 1, background: "#222", border: "1px solid #333",
                  color: "#888", borderRadius: 12, padding: 14,
                  fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editPrecio}
                style={{
                  flex: 2, background: saving ? "#333" : "#FFE000",
                  border: "none", color: "#000", borderRadius: 12, padding: 14,
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="inv-grid">
        {items.map((item) => {
          const vendidas = item.vendidas || 0;
          const mayoreo = item.precio_mayoreo || 0;
          const gananciaTotal = vendidas > 0 && mayoreo > 0
            ? (item.precio_venta - mayoreo) * vendidas
            : null;

          return (
            <div key={item.id} className="inv-card" style={{ position: "relative" }}>
              {/* Engrane de edición */}
              <button className="inv-btn-gear" onClick={() => openEdit(item)}>⚙</button>

              {item.foto_url
                ? <img src={item.foto_url} alt={item.nombre} className="inv-img" />
                : <div className="inv-img-placeholder">📦</div>
              }
              <div className="inv-info">
                <div className="inv-name" style={{ paddingRight: 28 }}>{item.nombre || "Sin nombre"}</div>
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
                    onClick={() => confirmSell(item)}
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
