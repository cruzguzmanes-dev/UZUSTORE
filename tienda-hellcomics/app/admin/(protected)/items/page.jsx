"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [borrando, setBorrando] = useState(null);

  const fetchItems = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/admin/items?${params}`);
    setItems(res.ok ? await res.json() : []);
    setCargando(false);
  }, [q, estado]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 250); // debounce del buscador
    return () => clearTimeout(t);
  }, [fetchItems]);

  const cambiarStock = async (item, delta) => {
    const nuevoStock = Math.max(0, (item.stock || 0) + delta);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, stock: nuevoStock } : it)));
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: nuevoStock }),
    });
  };

  const toggleEstado = async (item) => {
    const nuevoEstado = item.estado === "agotado" ? "activo" : "agotado";
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, estado: nuevoEstado } : it)));
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
  };

  const eliminar = async (item) => {
    await fetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    setBorrando(null);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-extrabold text-white">Items ({items.length})</h1>
        <Link
          href="/admin/items/nuevo"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
        >
          + Nuevo item
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="rounded-lg border border-white/15 bg-brand-surface px-3 py-2 text-sm text-white outline-none focus:border-brand"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-white/15 bg-brand-surface px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="agotado">Agotado</option>
          <option value="oculto">Oculto</option>
        </select>
      </div>

      {cargando ? (
        <p className="text-white/40">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-white/40">Sin items.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {item.imagenes?.[0]?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imagenes[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-semibold text-white">{item.nombre}</div>
                        <div className="text-xs text-white/40">{item.categorias?.nombre || "Sin categoría"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-brand">{fmt(item.precio)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => cambiarStock(item, -1)}
                        className="h-6 w-6 rounded bg-white/10 text-white/70 hover:bg-white/20"
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{item.stock}</span>
                      <button
                        onClick={() => cambiarStock(item, 1)}
                        className="h-6 w-6 rounded bg-white/10 text-white/70 hover:bg-white/20"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleEstado(item)}
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        item.estado === "agotado" ? "bg-white/10 text-white/50" : "bg-brand/20 text-brand"
                      }`}
                    >
                      {item.estado}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/items/${item.id}`} className="text-white/50 hover:text-white">
                        ✎
                      </Link>
                      {borrando === item.id ? (
                        <>
                          <button onClick={() => eliminar(item)} className="text-red-400">
                            Sí
                          </button>
                          <button onClick={() => setBorrando(null)} className="text-white/40">
                            No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setBorrando(item.id)} className="text-white/50 hover:text-red-400">
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
