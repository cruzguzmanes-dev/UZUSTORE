"use client";

import { useEffect, useState } from "react";

// item: { id, nombre, tiene_tallas }. Si tiene_tallas, carga la talla al abrir (la lista
// de items no trae ese detalle, solo el total).
export default function VenderModal({ item, onClose, onVendido }) {
  const [cantidad, setCantidad] = useState("1");
  const [talla, setTalla] = useState("");
  const [variantes, setVariantes] = useState(null); // null mientras carga (solo si tiene_tallas)
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!item.tiene_tallas) return;
    fetch(`/api/admin/items/${item.id}`)
      .then((r) => r.json())
      .then((data) => {
        const vs = data.variantes || [];
        setVariantes(vs);
        setTalla(vs.find((v) => v.stock > 0)?.talla || vs[0]?.talla || "");
      });
  }, [item]);

  // Cuánto hay disponible para vender -- de la talla elegida, o del stock simple.
  const maxDisponible = item.tiene_tallas ? variantes?.find((v) => v.talla === talla)?.stock ?? 1 : item.stock ?? 1;

  const elegirTalla = (nuevaTalla) => {
    setTalla(nuevaTalla);
    const max = Math.max(1, variantes?.find((v) => v.talla === nuevaTalla)?.stock ?? 1);
    setCantidad((c) => String(Math.min(parseInt(c, 10) || 1, max)));
  };

  const cambiarCantidad = (valor) => {
    const max = Math.max(1, maxDisponible);
    setCantidad(valor === "" ? "" : String(Math.max(1, Math.min(parseInt(valor, 10) || 1, max))));
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError("");
    if (item.tiene_tallas && !talla) {
      setError("Elige una talla");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, talla: item.tiene_tallas ? talla : undefined, cantidad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la venta");
      onVendido(data.stock);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cargandoTallas = item.tiene_tallas && variantes === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={confirmar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-brand-dark p-5"
      >
        <h2 className="mb-1 font-display text-base font-extrabold text-white">Registrar venta</h2>
        <p className="mb-4 text-sm text-white/50">{item.nombre}</p>

        {item.tiene_tallas && (
          <div className="mb-3">
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Talla</label>
            {cargandoTallas ? (
              <p className="text-sm text-white/40">Cargando...</p>
            ) : (
              <select
                value={talla}
                onChange={(e) => elegirTalla(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              >
                {variantes.map((v) => (
                  <option key={v.talla} value={v.talla} disabled={v.stock <= 0}>
                    {v.talla} -- {v.stock <= 0 ? "agotada" : `quedan ${v.stock}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
            Cantidad {!cargandoTallas && <span className="normal-case text-white/30">(de {maxDisponible} disponibles)</span>}
          </label>
          <input
            type="number"
            min="1"
            max={maxDisponible}
            value={cantidad}
            onChange={(e) => cambiarCantidad(e.target.value)}
            className="w-24 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-400">⚠ {error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || cargandoTallas}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Confirmar venta"}
          </button>
        </div>
      </form>
    </div>
  );
}
