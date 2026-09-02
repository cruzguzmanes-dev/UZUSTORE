"use client";

import { useState } from "react";

const NUEVA = "__nueva__";

// value: { categoria_id } o { categoria_nueva } (mutuamente excluyentes)
export default function CategorySelect({ categorias, categoriaId, categoriaNueva, onChange }) {
  const [creando, setCreando] = useState(false);

  const onSelect = (e) => {
    const val = e.target.value;
    if (val === NUEVA) {
      setCreando(true);
      onChange({ categoria_id: null, categoria_nueva: "" });
    } else {
      setCreando(false);
      onChange({ categoria_id: val || null, categoria_nueva: "" });
    }
  };

  return (
    <div>
      {!creando ? (
        <select
          value={categoriaId || ""}
          onChange={onSelect}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
          <option value={NUEVA}>+ Nueva categoría...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={categoriaNueva}
            onChange={(e) => onChange({ categoria_id: null, categoria_nueva: e.target.value })}
            placeholder="Nombre de la categoría"
            className="flex-1 rounded-lg border border-brand bg-black/30 px-3 py-2 text-white outline-none"
          />
          <button
            type="button"
            onClick={() => { setCreando(false); onChange({ categoria_id: null, categoria_nueva: "" }); }}
            className="rounded-lg border border-white/15 px-3 text-sm text-white/60"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
