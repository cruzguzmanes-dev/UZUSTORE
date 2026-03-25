import React, { useState } from "react";
import { fmt } from "../../utils";

const fmtFecha = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

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
    max-height: 80vh;
    overflow-y: auto;
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
  /* Botón principal — ocupa toda la fila */
  .inv-btn-sell {
    width: 100%; display: block;
    background: #1e3a1e; border: 1px solid #2d5a2d;
    color: #7ecc7e; border-radius: 10px; padding: 11px 0;
    font-size: 13px; font-family: 'Space Mono', monospace;
    cursor: pointer; font-weight: 700; margin-bottom: 7px;
  }
  .inv-btn-sell:disabled { background: #1a1a1a; border-color: #222; color: #444; cursor: not-allowed; }
  /* Fila secundaria: Stock + Eliminar */
  .inv-actions-secondary { display: flex; gap: 7px; margin-bottom: 6px; }
  .inv-btn-restock {
    flex: 1;
    background: rgba(26,42,58,0.8); border: 1px solid #2a4a5a;
    color: #7ec5cc; border-radius: 8px; padding: 6px 0;
    font-size: 11px; font-family: 'Space Mono', monospace;
    cursor: pointer; font-weight: 700;
  }
  .inv-btn-delete {
    background: rgba(42,26,26,0.8); border: 1px solid #4a2a2a;
    color: #ff8080; border-radius: 8px; padding: 6px 12px;
    font-size: 13px; font-family: 'Space Mono', monospace; cursor: pointer;
  }
  .inv-btn-gear {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #666; border-radius: 8px; padding: 5px 8px;
    font-size: 14px; cursor: pointer; line-height: 1;
  }
  .inv-btn-gear:hover { background: rgba(255,255,255,0.12); color: #aaa; }
  .inv-link-hist {
    background: none; border: none; padding: 0;
    font-family: 'Space Mono', monospace; font-size: 10px;
    color: #555; cursor: pointer; text-decoration: underline;
    text-underline-offset: 2px;
  }
  .inv-link-hist:hover { color: #aaa; }
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
  .hist-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .hist-row:last-child { border-bottom: none; }
  .hist-fecha { font-family: 'Space Mono', monospace; font-size: 11px; color: #666; }
  .hist-precio { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #7ecc7e; }
  .hist-cant { font-family: 'Space Mono', monospace; font-size: 11px; color: #aaa; }
`;

export default function InventarioTable({ items, isAdmin = false, onItemDeleted, onItemSold }) {
  const [deletingId, setDeletingId]       = useState(null);
  const [sellingId, setSellingId]         = useState(null);
  const [restockingId, setRestockingId]   = useState(null);
  const [confirmItem, setConfirmItem]     = useState(null);
  const [deleteItem, setDeleteItem]       = useState(null);
  const [editItem, setEditItem]           = useState(null);
  const [editNombre, setEditNombre]       = useState("");
  const [editPrecio, setEditPrecio]       = useState("");
  const [saving, setSaving]               = useState(false);

  // Restock
  const [restockItem, setRestockItem]     = useState(null);
  const [restockQty, setRestockQty]       = useState("1");

  // Historial (admin)
  const [historialItem, setHistorialItem] = useState(null);
  const [historialData, setHistorialData] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  /* ─── Venta ─── */
  const confirmSell = (item) => {
    if (item.cantidad <= 0) return;
    setConfirmItem(item);
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
        body: JSON.stringify({
          cantidad: item.cantidad - 1,
          vendidas: (item.vendidas || 0) + 1,
          log_venta: {
            distribuidor_id: item.distribuidor_id,
            precio_venta: item.precio_venta,
          },
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

  /* ─── Restock ─── */
  const openRestock = (item) => {
    setRestockQty("1");
    setRestockItem(item);
  };

  const handleRestock = async () => {
    const item = restockItem;
    const qty  = parseInt(restockQty) || 1;
    setRestockItem(null);
    setRestockingId(item.id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: item.cantidad + qty }),
      });
      if (!res.ok) throw new Error("Error en restock");
      onItemSold(); // refresca
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setRestockingId(null);
    }
  };

  /* ─── Historial ─── */
  const openHistorial = async (item) => {
    setHistorialItem(item);
    setHistorialData([]);
    setHistorialLoading(true);
    try {
      const res = await fetch(`/api/distribuidor/historial?item_id=${item.id}`);
      if (!res.ok) throw new Error("Error cargando historial");
      setHistorialData(await res.json());
    } catch (e) {
      setHistorialData([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    const item = deleteItem;
    setDeleteItem(null);
    if (!item) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/distribuidor/inventario?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error eliminando");
      onItemDeleted();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── Edit ─── */
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
      onItemSold();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render ─── */
  return (
    <>
      <style>{CSS}</style>

      {/* ── Sheet: Confirmar venta ── */}
      {confirmItem && (
        <div className="confirm-overlay" onClick={() => setConfirmItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
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
              <button onClick={() => setConfirmItem(null)}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleMarkSold}
                style={{ flex: 2, background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                ✓ Sí, se vendió
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Restock ── */}
      {restockItem && (
        <div className="confirm-overlay" onClick={() => setRestockItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
              {restockItem.foto_url
                ? <img src={restockItem.foto_url} alt="" className="confirm-foto" />
                : <div className="confirm-foto-placeholder">📦</div>
              }
              <div>
                <p style={{ margin: "0 0 4px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                  {restockItem.nombre || "Sin nombre"}
                </p>
                <p style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>
                  Stock actual: <strong style={{ color: "#fff" }}>{restockItem.cantidad}</strong>
                </p>
              </div>
            </div>

            <label className="edit-lbl">Unidades a agregar</label>
            <input
              className="edit-inp"
              type="number"
              min="1"
              value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              autoFocus
            />
            <p style={{ margin: "0 0 18px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", textAlign: "center" }}>
              Nuevo stock: <strong style={{ color: "#fff" }}>{restockItem.cantidad + (parseInt(restockQty) || 0)}</strong>
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRestockItem(null)}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleRestock} disabled={!restockQty || parseInt(restockQty) < 1}
                style={{ flex: 2, background: "#1a2a3a", border: "1px solid #2a4a5a", color: "#7ec5cc", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📦 Agregar al stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Historial (admin) ── */}
      {historialItem && (
        <div className="confirm-overlay" onClick={() => setHistorialItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                📋 Historial de ventas
              </p>
              <button onClick={() => setHistorialItem(null)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              {historialItem.nombre || "Sin nombre"}
            </p>

            {historialLoading ? (
              <p style={{ textAlign: "center", color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Cargando...
              </p>
            ) : historialData.length === 0 ? (
              <p style={{ textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Sin ventas registradas aún
              </p>
            ) : (
              <>
                {/* Resumen rápido */}
                <div style={{ background: "rgba(0,200,100,0.06)", border: "1px solid rgba(0,200,100,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666" }}>
                    Total vendidas
                  </span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: "#7ecc7e" }}>
                    {historialData.reduce((s, v) => s + v.cantidad, 0)} uds · {fmt(historialData.reduce((s, v) => s + (v.precio_venta * v.cantidad), 0))}
                  </span>
                </div>

                {/* Lista */}
                {historialData.map((v) => (
                  <div key={v.id} className="hist-row">
                    <div>
                      <div className="hist-fecha">{fmtFecha(v.created_at)}</div>
                      <div className="hist-cant">x{v.cantidad} unidad{v.cantidad !== 1 ? "es" : ""}</div>
                    </div>
                    <div className="hist-precio">{fmt(v.precio_venta)}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Sheet: Confirmar borrado ── */}
      {deleteItem && (
        <div className="confirm-overlay" onClick={() => setDeleteItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
              {deleteItem.foto_url
                ? <img src={deleteItem.foto_url} alt="" className="confirm-foto" />
                : <div className="confirm-foto-placeholder">📦</div>
              }
              <div>
                <p style={{ margin: "0 0 4px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                  {deleteItem.nombre || "Sin nombre"}
                </p>
                <p style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>
                  Stock: {deleteItem.cantidad} · {fmt(deleteItem.precio_venta)}
                </p>
              </div>
            </div>
            <p style={{ margin: "0 0 18px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666", textAlign: "center" }}>
              ¿Eliminar este artículo? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteItem(null)}
                style={{ flex: 2, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleDelete}
                style={{ flex: 1, background: "#3a1a1a", border: "1px solid #5a2a2a", color: "#ff8080", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                ✕ Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Editar artículo ── */}
      {editItem && (
        <div className="confirm-overlay" onClick={() => setEditItem(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 18px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
              ⚙ Editar artículo
            </p>
            <label className="edit-lbl">Nombre</label>
            <input className="edit-inp" type="text" value={editNombre}
              onChange={e => setEditNombre(e.target.value)} placeholder="Ej: Goku Ultra Instinct" />
            <label className="edit-lbl">Tu Precio de Venta $</label>
            <input className="edit-inp" type="number" step="0.01" value={editPrecio}
              onChange={e => setEditPrecio(e.target.value)} placeholder="Ej: 650" />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setEditItem(null)}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit} disabled={saving || !editPrecio}
                style={{ flex: 2, background: saving ? "#333" : "#FFE000", border: "none", color: "#000", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid de artículos ── */}
      <div className="inv-grid">
        {items.map((item) => {
          const vendidas = item.vendidas || 0;
          const mayoreo  = item.precio_mayoreo || 0;
          const gananciaTotal = vendidas > 0 && mayoreo > 0
            ? (item.precio_venta - mayoreo) * vendidas
            : null;

          return (
            <div key={item.id} className="inv-card" style={{ position: "relative" }}>
              {/* Engrane */}
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

                {/* Ganancia acumulada — solo admin */}
                {isAdmin && gananciaTotal !== null && (
                  <div className="inv-ganancia">
                    Ganancia acumulada: <strong>{fmt(gananciaTotal)}</strong>
                  </div>
                )}

                {/* Acción principal */}
                <button className="inv-btn-sell"
                  onClick={() => confirmSell(item)}
                  disabled={item.cantidad <= 0 || sellingId === item.id}>
                  {sellingId === item.id ? "..." : "✓ Vendido"}
                </button>

                {/* Acciones secundarias */}
                <div className="inv-actions-secondary">
                  <button className="inv-btn-restock"
                    onClick={() => openRestock(item)}
                    disabled={restockingId === item.id}>
                    {restockingId === item.id ? "..." : "📦 + Stock"}
                  </button>
                  <button className="inv-btn-delete"
                    onClick={() => setDeleteItem(item)}
                    disabled={deletingId === item.id}>
                    {deletingId === item.id ? "..." : "✕"}
                  </button>
                </div>

                {/* Historial — solo admin */}
                {isAdmin && (
                  <button className="inv-link-hist" onClick={() => openHistorial(item)}>
                    ver historial de ventas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
