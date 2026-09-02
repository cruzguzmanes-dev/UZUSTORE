"use client";

import { useEffect, useState } from "react";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // { id, nombre }
  const [borrando, setBorrando] = useState(null);

  const cargar = () => fetch("/api/admin/categorias").then((r) => r.json()).then(setCategorias);

  useEffect(() => { cargar(); }, []);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError("");
    const res = await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNombre("");
    cargar();
  };

  const renombrar = async (cat) => {
    await fetch(`/api/admin/categorias/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editando.nombre }),
    });
    setEditando(null);
    cargar();
  };

  const eliminar = async (cat) => {
    setError("");
    const res = await fetch(`/api/admin/categorias/${cat.id}`, { method: "DELETE" });
    setBorrando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo eliminar");
      return;
    }
    cargar();
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-5 font-display text-lg font-extrabold text-white">Categorías</h1>

      <form onSubmit={agregar} className="mb-5 flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          Agregar
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

      <div className="rounded-xl border border-white/10">
        {categorias.length === 0 ? (
          <p className="p-4 text-sm text-white/40">Sin categorías todavía.</p>
        ) : (
          categorias.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 last:border-0">
              {editando?.id === cat.id ? (
                <input
                  autoFocus
                  value={editando.nombre}
                  onChange={(e) => setEditando({ id: cat.id, nombre: e.target.value })}
                  onBlur={() => renombrar(cat)}
                  onKeyDown={(e) => e.key === "Enter" && renombrar(cat)}
                  className="rounded border border-brand bg-black/30 px-2 py-1 text-sm text-white outline-none"
                />
              ) : (
                <span className="text-sm text-white">{cat.nombre}</span>
              )}
              <div className="flex gap-3 text-sm">
                <button onClick={() => setEditando({ id: cat.id, nombre: cat.nombre })} className="text-white/40 hover:text-white">
                  ✎
                </button>
                {borrando === cat.id ? (
                  <>
                    <button onClick={() => eliminar(cat)} className="text-red-400">Sí</button>
                    <button onClick={() => setBorrando(null)} className="text-white/40">No</button>
                  </>
                ) : (
                  <button onClick={() => setBorrando(cat.id)} className="text-white/40 hover:text-red-400">
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
