"use client";

import { useState } from "react";

// Cada palabra se vuelve un tag al escribir un espacio -- no hace falta dar enter.
export default function TagInput({ value = [], onChange }) {
  const [texto, setTexto] = useState("");

  const agregar = (palabra) => {
    const limpio = palabra.trim().toLowerCase();
    if (!limpio) return;
    if (value.includes(limpio)) return;
    onChange([...value, limpio]);
  };

  const onInputChange = (e) => {
    const val = e.target.value;
    if (val.endsWith(" ")) {
      agregar(val);
      setTexto("");
    } else {
      setTexto(val);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregar(texto);
      setTexto("");
    } else if (e.key === "Backspace" && !texto && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const quitar = (tag) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 focus-within:border-brand">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
          #{tag}
          <button type="button" onClick={() => quitar(tag)} className="text-white/40 hover:text-white">
            ×
          </button>
        </span>
      ))}
      <input
        value={texto}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        onBlur={() => { agregar(texto); setTexto(""); }}
        placeholder={value.length ? "" : "marvel batman edicion-especial..."}
        className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/30"
      />
    </div>
  );
}
