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
    const res = await fetch(`/api/admin/secciones/${id}`, { method: "DELETE" });
    setBorrando(null);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "No se pudo borrar");
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

  // Sección manual: la lista es lo que se muestra. Optimista + PUT.
  const guardarItems = async (seccion, nuevosItems) => {
    setSecciones((prev) => prev.map((s) => (s.id === seccion.id ? { ...s, items: nuevosItems } : s)));
    await fetch(`/api/admin/secciones/${seccion.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_ids: nuevosItems.map((i) => i.id) }),
    });
  };

  // Sección novedades: la lista guardada son los EXCLUIDOS. Se refresca del server para
  // que la lista automática vuelva a quedar ordenada por fecha.
  const guardarExcluidos = async (seccion, nuevosExcluidos) => {
    await fetch(`/api/admin/secciones/${seccion.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_ids: nuevosExcluidos.map((i) => i.id) }),
    });
    await cargar();
  };

  if (!secciones) return <p className="text-white/40">Cargando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-lg font-extrabold text-white">Secciones del Home</h1>
      <p className="mb-5 text-xs text-white/40">
        Cada sección aparece en la página principal con los items que le pongas. El orden de arriba hacia abajo es el
        orden en que se ven. "Novedades" se llena sola con lo más nuevo, pero puedes ocultarle items y moverla de lugar.
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
            onGuardarExcluidos={(exc) => guardarExcluidos(s, exc)}
          />
        ))}
      </div>
    </div>
  );
}

function FilaItem({ item, children }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 p-1.5">
      {item.imagenes?.[0]?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imagenes[0].url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-white">{item.nombre}</div>
        <div className="text-xs text-white/40">
          {fmt(item.precio)}
          {(item.estado === "oculto" || !item.publico) && (
            <span className="ml-1 text-red-400/70">· no se ve en el Home</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Flechas({ onSubir, onBajar, arribaTope, abajoTope }) {
  return (
    <div className="flex flex-col">
      <button onClick={onSubir} disabled={arribaTope} className="text-white/40 hover:text-white disabled:opacity-20" aria-label="Subir">
        ▲
      </button>
      <button onClick={onBajar} disabled={abajoTope} className="text-white/40 hover:text-white disabled:opacity-20" aria-label="Bajar">
        ▼
      </button>
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
  onGuardarExcluidos,
}) {
  const [nombre, setNombre] = useState(seccion.nombre);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const esNovedades = seccion.tipo === "novedades";

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
  const quitarManual = (itemId) => onGuardarItems(seccion.items.filter((it) => it.id !== itemId));
  const moverItem = (index, dir) => {
    const nuevo = [...seccion.items];
    const j = index + dir;
    if (j < 0 || j >= nuevo.length) return;
    [nuevo[index], nuevo[j]] = [nuevo[j], nuevo[index]];
    onGuardarItems(nuevo);
  };

  const excluir = (item) => onGuardarExcluidos([...seccion.excluidos, item]);
  const restaurar = (itemId) => onGuardarExcluidos(seccion.excluidos.filter((it) => it.id !== itemId));

  return (
    <div className={`rounded-xl border p-3 ${seccion.activa ? "border-white/10" : "border-white/10 opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Flechas onSubir={() => onMover(-1)} onBajar={() => onMover(1)} arribaTope={primera} abajoTope={ultima} />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => nombre.trim() && nombre.trim() !== seccion.nombre && onRenombrar(nombre.trim())}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-brand"
        />
        {esNovedades && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
            automática
          </span>
        )}
        <button
          onClick={onToggleActiva}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            seccion.activa ? "border-brand bg-brand/15 text-white" : "border-white/15 text-white/50"
          }`}
        >
          {seccion.activa ? "Visible" : "Oculta"}
        </button>
        {!esNovedades &&
          (confirmandoBorrado ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button onClick={onBorrar} className="font-semibold text-red-400">Borrar</button>
              <button onClick={onCancelarBorrado} className="text-white/40">No</button>
            </span>
          ) : (
            <button onClick={onBorrar} className="text-white/50 hover:text-red-400" aria-label="Borrar sección">
              🗑
            </button>
          ))}
      </div>

      {esNovedades ? (
        <>
          <p className="mt-2 text-xs text-white/40">
            Se llena sola con los productos más nuevos. Aquí solo eliges cuáles ocultar.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {seccion.items.length === 0 && <p className="text-xs text-white/30">Sin novedades por mostrar.</p>}
            {seccion.items.map((it) => (
              <FilaItem key={it.id} item={it}>
                <button onClick={() => excluir(it)} className="shrink-0 whitespace-nowrap px-1 text-xs text-white/40 hover:text-red-400">
                  Ocultar
                </button>
              </FilaItem>
            ))}
          </div>
          {seccion.excluidos.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-white/30">Ocultos de Novedades</p>
              <div className="flex flex-col gap-1.5">
                {seccion.excluidos.map((it) => (
                  <FilaItem key={it.id} item={it}>
                    <button onClick={() => restaurar(it.id)} className="shrink-0 whitespace-nowrap px-1 text-xs font-semibold text-brand hover:underline">
                      Restaurar
                    </button>
                  </FilaItem>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-1.5">
            {seccion.items.length === 0 && (
              <p className="text-xs text-white/30">Sin items -- esta sección no se muestra en el Home.</p>
            )}
            {seccion.items.map((it, idx) => (
              <FilaItem key={it.id} item={it}>
                <Flechas
                  onSubir={() => moverItem(idx, -1)}
                  onBajar={() => moverItem(idx, 1)}
                  arribaTope={idx === 0}
                  abajoTope={idx === seccion.items.length - 1}
                />
                <button onClick={() => quitarManual(it.id)} className="shrink-0 px-1 text-white/40 hover:text-red-400" aria-label="Quitar">
                  ✕
                </button>
              </FilaItem>
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
        </>
      )}
    </div>
  );
}
