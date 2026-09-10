"use client";

import { useEffect, useState } from "react";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export default function SeccionesPage() {
  const [secciones, setSecciones] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(null);

  const cargar = () => fetch("/api/admin/secciones").then((r) => r.json()).then(setSecciones);

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    setError("");
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const res = await fetch("/api/admin/secciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "No se pudo crear");
      return;
    }
    setNuevoNombre("");
    await cargar();
  };

  const patchSeccion = async (id, cambios) => {
    setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
    await fetch(`/api/admin/secciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
  };

  const borrarSeccion = async (id) => {
    await fetch(`/api/admin/secciones/${id}`, { method: "DELETE" });
    setBorrando(null);
    await cargar();
  };

  const moverSeccion = async (index, dir) => {
    const nuevo = [...secciones];
    const j = index + dir;
    if (j < 0 || j >= nuevo.length) return;
    [nuevo[index], nuevo[j]] = [nuevo[j], nuevo[index]];
    setSecciones(nuevo);
    await fetch("/api/admin/secciones/orden", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nuevo.map((s) => s.id) }),
    });
  };

  const guardarItems = async (seccion, nuevosItems) => {
    setSecciones((prev) => prev.map((s) => (s.id === seccion.id ? { ...s, items: nuevosItems } : s)));
    await fetch(`/api/admin/secciones/${seccion.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_ids: nuevosItems.map((i) => i.id) }),
    });
  };

  if (!secciones) return <p className="text-white/40">Cargando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-lg font-extrabold text-white">Secciones del Home</h1>
      <p className="mb-5 text-xs text-white/40">
        Cada sección aparece en la página principal con los items que le pongas aquí. El orden de arriba hacia abajo
        es el orden en que se ven. "Novedades" es automática y siempre va al final.
      </p>

      <div className="mb-6 flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crear()}
          placeholder="Nombre de la sección (ej. Descuentos)"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
        />
        <button onClick={crear} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          + Nueva sección
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

      {secciones.length === 0 ? (
        <p className="text-white/40">Todavía no hay secciones. Crea una arriba.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {secciones.map((s, i) => (
            <Seccion
              key={s.id}
              seccion={s}
              primera={i === 0}
              ultima={i === secciones.length - 1}
              onMover={(dir) => moverSeccion(i, dir)}
              onRenombrar={(nombre) => patchSeccion(s.id, { nombre })}
              onToggleActiva={() => patchSeccion(s.id, { activa: !s.activa })}
              onBorrar={() => (borrando === s.id ? borrarSeccion(s.id) : setBorrando(s.id))}
              confirmandoBorrado={borrando === s.id}
              onCancelarBorrado={() => setBorrando(null)}
              onGuardarItems={(items) => guardarItems(s, items)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Seccion({
  seccion,
  primera,
  ultima,
  onMover,
  onRenombrar,
  onToggleActiva,
  onBorrar,
  confirmandoBorrado,
  onCancelarBorrado,
  onGuardarItems,
}) {
  const [nombre, setNombre] = useState(seccion.nombre);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);

  const buscar = async (texto) => {
    setQ(texto);
    if (!texto.trim()) return setResultados([]);
    const res = await fetch(`/api/admin/items?q=${encodeURIComponent(texto)}`);
    const data = res.ok ? await res.json() : [];
    const yaEstan = new Set(seccion.items.map((it) => it.id));
    setResultados(data.filter((it) => !yaEstan.has(it.id)).slice(0, 6));
  };

  const agregar = (item) => {
    onGuardarItems([...seccion.items, item]);
    setQ("");
    setResultados([]);
  };
  const quitar = (itemId) => onGuardarItems(seccion.items.filter((it) => it.id !== itemId));
  const moverItem = (index, dir) => {
    const nuevo = [...seccion.items];
    const j = index + dir;
    if (j < 0 || j >= nuevo.length) return;
    [nuevo[index], nuevo[j]] = [nuevo[j], nuevo[index]];
    onGuardarItems(nuevo);
  };

  return (
    <div className={`rounded-xl border p-3 ${seccion.activa ? "border-white/10" : "border-white/10 opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <button
            onClick={() => onMover(-1)}
            disabled={primera}
            className="text-white/40 hover:text-white disabled:opacity-20"
            aria-label="Subir sección"
          >
            ▲
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={ultima}
            className="text-white/40 hover:text-white disabled:opacity-20"
            aria-label="Bajar sección"
          >
            ▼
          </button>
        </div>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => nombre.trim() && nombre.trim() !== seccion.nombre && onRenombrar(nombre.trim())}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-brand"
        />
        <button
          onClick={onToggleActiva}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            seccion.activa ? "border-brand bg-brand/15 text-white" : "border-white/15 text-white/50"
          }`}
        >
          {seccion.activa ? "Visible" : "Oculta"}
        </button>
        {confirmandoBorrado ? (
          <span className="flex items-center gap-1.5 text-xs">
            <button onClick={onBorrar} className="font-semibold text-red-400">Borrar</button>
            <button onClick={onCancelarBorrado} className="text-white/40">No</button>
          </span>
        ) : (
          <button onClick={onBorrar} className="text-white/50 hover:text-red-400" aria-label="Borrar sección">
            🗑
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {seccion.items.length === 0 && <p className="text-xs text-white/30">Sin items -- esta sección no se muestra en el Home.</p>}
        {seccion.items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 p-1.5">
            {it.imagenes?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.imagenes[0].url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{it.nombre}</div>
              <div className="text-xs text-white/40">
                {fmt(it.precio)}
                {(it.estado === "oculto" || !it.publico) && (
                  <span className="ml-1 text-red-400/70">· no se ve en el Home</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <button onClick={() => moverItem(idx, -1)} disabled={idx === 0} className="text-white/40 hover:text-white disabled:opacity-20" aria-label="Subir">
                ▲
              </button>
              <button onClick={() => moverItem(idx, 1)} disabled={idx === seccion.items.length - 1} className="text-white/40 hover:text-white disabled:opacity-20" aria-label="Bajar">
                ▼
              </button>
            </div>
            <button onClick={() => quitar(it.id)} className="shrink-0 px-1 text-white/40 hover:text-red-400" aria-label="Quitar">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="relative mt-2">
        <input
          value={q}
          onChange={(e) => buscar(e.target.value)}
          placeholder="+ Agregar item (buscar por nombre)..."
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
        />
        {resultados.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-brand-dark shadow-lg">
            {resultados.map((it) => (
              <button
                key={it.id}
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
    </div>
  );
}
