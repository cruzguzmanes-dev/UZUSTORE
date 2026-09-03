"use client";

import { useState } from "react";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export default function NuevaVentaPage() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [lineas, setLineas] = useState([]); // { key, item_id, nombre, precio, tiene_tallas, talla, tallas, cantidad }
  const [total, setTotal] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [hecha, setHecha] = useState(null);

  const buscar = async (texto) => {
    setQ(texto);
    if (!texto.trim()) {
      setResultados([]);
      return;
    }
    const res = await fetch(`/api/admin/items?q=${encodeURIComponent(texto)}`);
    const data = res.ok ? await res.json() : [];
    setResultados(data.slice(0, 8));
  };

  const agregar = async (item) => {
    const key = `${item.id}-${Date.now()}`;
    setLineas((prev) => [
      ...prev,
      {
        key,
        item_id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        tiene_tallas: item.tiene_tallas,
        talla: "",
        tallas: item.tiene_tallas ? null : undefined, // null = cargando, undefined = no aplica
        cantidad: "1",
      },
    ]);
    setResultados([]);
    setQ("");

    if (item.tiene_tallas) {
      const r = await fetch(`/api/admin/items/${item.id}`);
      const data = await r.json();
      const tallas = data.variantes || [];
      const primera = tallas.find((v) => v.stock > 0)?.talla || tallas[0]?.talla || "";
      setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, tallas, talla: primera } : l)));
    }
  };

  const actualizar = (key, campo, valor) =>
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));

  const quitar = (key) => setLineas((prev) => prev.filter((l) => l.key !== key));

  const subtotal = lineas.reduce((s, l) => s + l.precio * (parseInt(l.cantidad, 10) || 0), 0);
  const totalNum = total === "" ? subtotal : parseFloat(total) || 0;
  const diferencia = subtotal - totalNum;

  const confirmar = async () => {
    setError("");
    if (lineas.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    if (lineas.some((l) => l.tiene_tallas && !l.talla)) {
      setError("Falta elegir la talla de algún producto");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/ventas/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineas: lineas.map((l) => ({ item_id: l.item_id, talla: l.tiene_tallas ? l.talla : undefined, cantidad: l.cantidad })),
          total: totalNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la venta");
      setHecha(data.grupo);
      setLineas([]);
      setTotal("");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-lg font-extrabold text-white">Nueva venta</h1>
        <Link href="/admin/ventas" className="text-sm text-white/50 hover:text-brand">
          ← Ventas
        </Link>
      </div>

      {hecha && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
          Venta registrada por {fmt(hecha.total)} ✓ -- puedes armar otra abajo.
        </p>
      )}

      <div className="relative mb-4">
        <input
          value={q}
          onChange={(e) => buscar(e.target.value)}
          placeholder="Buscar producto para agregar..."
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        />
        {resultados.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-brand-dark shadow-lg">
            {resultados.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => agregar(it)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white hover:bg-white/5"
              >
                <span>{it.nombre}</span>
                <span className="text-white/40">{fmt(it.precio)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lineas.length === 0 ? (
        <p className="mb-6 text-sm text-white/40">Busca arriba y agrega los productos que se vendieron.</p>
      ) : (
        <div className="mb-6 flex flex-col gap-2">
          {lineas.map((l) => (
            <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white">{l.nombre}</div>
                <div className="text-xs text-white/40">{fmt(l.precio)} c/u</div>
              </div>

              {l.tiene_tallas &&
                (l.tallas === null ? (
                  <span className="text-xs text-white/40">cargando tallas...</span>
                ) : (
                  <select
                    value={l.talla}
                    onChange={(e) => actualizar(l.key, "talla", e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                  >
                    {l.tallas.map((v) => (
                      <option key={v.talla} value={v.talla} disabled={v.stock <= 0}>
                        {v.talla} {v.stock <= 0 ? "(agotada)" : ""}
                      </option>
                    ))}
                  </select>
                ))}

              <input
                type="number"
                min="1"
                value={l.cantidad}
                onChange={(e) => actualizar(l.key, "cantidad", e.target.value)}
                className="w-14 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-center text-sm text-white outline-none"
              />

              <button type="button" onClick={() => quitar(l.key)} className="text-white/40 hover:text-red-400" aria-label="Quitar">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between text-sm text-white/60">
        <span>Subtotal ({lineas.length} {lineas.length === 1 ? "producto" : "productos"})</span>
        <span>{fmt(subtotal)}</span>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-white/60">Total cobrado</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder={subtotal.toFixed(2)}
          className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-right text-white outline-none focus:border-brand"
        />
      </div>

      {diferencia > 0 && <p className="mb-4 text-right text-xs text-white/40">Descuento: {fmt(diferencia)}</p>}
      {diferencia < 0 && <p className="mb-4 text-right text-xs text-white/40">Recargo: {fmt(-diferencia)}</p>}

      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={guardando || lineas.length === 0}
        className="w-full rounded-lg bg-brand px-6 py-3 font-display font-bold text-white disabled:opacity-50"
      >
        {guardando ? "Guardando..." : `Confirmar venta -- ${fmt(totalNum)}`}
      </button>
    </div>
  );
}
