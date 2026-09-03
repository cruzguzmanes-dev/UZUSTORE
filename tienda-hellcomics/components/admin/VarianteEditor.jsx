"use client";

const PRESETS = ["S", "M", "L", "XL", "XXL"];

// value: [{ talla, stock }]
export default function VarianteEditor({ value, onChange }) {
  const agregar = (talla = "") => onChange([...value, { talla, stock: "0" }]);
  const quitar = (i) => onChange(value.filter((_, idx) => idx !== i));
  const actualizar = (i, campo, val) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, [campo]: val } : v)));

  const presetsDisponibles = PRESETS.filter((p) => !value.some((v) => v.talla === p));

  return (
    <div>
      {presetsDisponibles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {presetsDisponibles.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => agregar(p)}
              className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60 hover:border-brand hover:text-white"
            >
              + {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {value.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={v.talla}
              onChange={(e) => actualizar(i, "talla", e.target.value)}
              placeholder="Talla (ej. M, 32, única)"
              className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />
            <input
              type="number"
              min="0"
              value={v.stock}
              onChange={(e) => actualizar(i, "stock", e.target.value)}
              placeholder="Stock"
              className="w-20 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => quitar(i)}
              className="shrink-0 text-white/40 hover:text-red-400"
              aria-label="Quitar talla"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => agregar()} className="mt-2 text-xs font-semibold text-brand hover:underline">
        + Agregar talla
      </button>

      {value.length === 0 && <p className="mt-1 text-xs text-white/40">Agrega al menos una talla con su stock.</p>}
    </div>
  );
}
