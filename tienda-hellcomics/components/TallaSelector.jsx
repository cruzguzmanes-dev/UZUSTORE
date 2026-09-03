"use client";

import { useState } from "react";
import { linkWhatsapp } from "@/lib/whatsapp";

// variantes: [{ talla, stock }] -- ya vienen ordenadas como las cargó el admin.
export default function TallaSelector({ variantes, numero, item, urlProducto }) {
  const primeraConStock = variantes.find((v) => v.stock > 0);
  const [talla, setTalla] = useState((primeraConStock || variantes[0])?.talla || "");
  const actual = variantes.find((v) => v.talla === talla);
  const agotada = !actual || actual.stock <= 0;

  return (
    <div className="mt-4">
      <div className="mb-1.5 text-xs uppercase tracking-wide text-white/50">Talla</div>
      <div className="flex flex-wrap gap-2">
        {variantes.map((v) => {
          const sinStock = v.stock <= 0;
          const activa = v.talla === talla;
          return (
            <button
              key={v.talla}
              type="button"
              onClick={() => setTalla(v.talla)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                activa ? "border-brand bg-brand/20 text-white" : "border-white/15 text-white/70 hover:border-white/40"
              } ${sinStock ? "opacity-40 line-through" : ""}`}
            >
              {v.talla}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-white/50">{agotada ? "Talla agotada" : `Quedan ${actual.stock}`}</p>

      <a
        href={linkWhatsapp(numero, item, urlProducto, talla)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 font-display font-bold text-white transition hover:brightness-110"
      >
        Me interesa
      </a>
    </div>
  );
}
