"use client";

import { useEffect, useState } from "react";

export default function EstadisticasPage() {
  const [datos, setDatos] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  useEffect(() => {
    fetch("/api/admin/estadisticas")
      .then((r) => r.json())
      .then((d) => {
        setDatos(d);
        const diasConDatos = Object.keys(d.itemsPorDia || {});
        setDiaSeleccionado(diasConDatos[0] || null); // el más reciente con visitas a producto
      });
  }, []);

  if (!datos) return <p className="text-white/40">Cargando...</p>;

  const maxDia = Math.max(1, ...datos.dias.map((d) => d.visitas));
  const maxHora = Math.max(1, ...datos.horas.map((h) => h.visitas));
  const diasConItems = Object.keys(datos.itemsPorDia || {});
  const itemsDelDia = diaSeleccionado ? datos.itemsPorDia[diaSeleccionado] || [] : [];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 font-display text-lg font-extrabold text-white">Estadísticas</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total" valor={datos.total} />
        <Tile label="Hoy" valor={datos.hoy} />
        <Tile label="Esta semana" valor={datos.semana} />
        <Tile label="Este mes" valor={datos.mes} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Visitas por día (últimos 14)</h2>
      <div className="mb-8 flex items-end gap-1.5 rounded-xl border border-white/10 p-4">
        {datos.dias.map((d) => (
          <div key={d.dia} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand"
              style={{ height: `${Math.max(4, (d.visitas / maxDia) * 80)}px` }}
              title={`${d.dia}: ${d.visitas} visitas`}
            />
            <span className="text-[9px] text-white/30">{d.dia.slice(8, 10)}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Horas más concurrentes (últimos 30 días, hora CDMX)</h2>
      <div className="mb-8 flex items-end gap-1 rounded-xl border border-white/10 p-4">
        {datos.horas.map((h) => (
          <div key={h.hora} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand"
              style={{ height: `${Math.max(4, (h.visitas / maxHora) * 80)}px` }}
              title={`${h.hora}:00 -- ${h.visitas} visitas`}
            />
            {h.hora % 3 === 0 && <span className="text-[9px] text-white/30">{h.hora}</span>}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Items vistos por día</h2>
      {diasConItems.length === 0 ? (
        <p className="mb-8 text-sm text-white/40">Sin visitas a productos todavía.</p>
      ) : (
        <div className="mb-8">
          <select
            value={diaSeleccionado || ""}
            onChange={(e) => setDiaSeleccionado(e.target.value)}
            className="mb-3 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          >
            {diasConItems.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="rounded-xl border border-white/10">
            {itemsDelDia.map((it) => (
              <div key={it.path} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
                <span className="text-white/80">{it.nombre}</span>
                <span className="font-semibold text-brand">{it.visitas}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-white/70">Páginas más vistas (últimos 30 días)</h2>
      <div className="rounded-xl border border-white/10">
        {datos.topPaths.length === 0 ? (
          <p className="p-4 text-sm text-white/40">Sin datos todavía.</p>
        ) : (
          datos.topPaths.map((p) => (
            <div key={p.path} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
              <span className="text-white/80">{p.path}</span>
              <span className="font-semibold text-brand">{p.visitas}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tile({ label, valor }) {
  return (
    <div className="rounded-xl border border-white/10 bg-brand-surface p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="font-display text-2xl font-extrabold text-white">{valor}</p>
    </div>
  );
}
