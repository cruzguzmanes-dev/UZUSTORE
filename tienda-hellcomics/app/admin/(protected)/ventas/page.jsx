"use client";

import { useEffect, useState } from "react";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const fmtFecha = (iso) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default function VentasPage() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    fetch("/api/admin/ventas")
      .then((r) => r.json())
      .then(setDatos);
  }, []);

  if (!datos) return <p className="text-white/40">Cargando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 font-display text-lg font-extrabold text-white">Ventas</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Hoy" datos={datos.hoy} />
        <Tile label="Esta semana" datos={datos.semana} />
        <Tile label="Este mes" datos={datos.mes} />
        <Tile label="Total" datos={datos.total} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Más vendidos (últimos 30 días)</h2>
      <div className="mb-8 rounded-xl border border-white/10">
        {datos.topVendidos.length === 0 ? (
          <p className="p-4 text-sm text-white/40">Sin ventas registradas todavía.</p>
        ) : (
          datos.topVendidos.map((it) => (
            <div key={it.nombre} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
              <span className="text-white/80">{it.nombre}</span>
              <span className="flex items-center gap-3">
                <span className="text-white/40">{it.piezas} pz</span>
                <span className="font-semibold text-brand">{fmt(it.ingresos)}</span>
              </span>
            </div>
          ))
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Ventas recientes</h2>
      <div className="rounded-xl border border-white/10">
        {datos.recientes.length === 0 ? (
          <p className="p-4 text-sm text-white/40">Todavía no registras ninguna venta -- usa el botón "Vender" en Items.</p>
        ) : (
          datos.recientes.map((v) => (
            <div key={v.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
              <div className="min-w-0">
                <div className="truncate text-white/80">
                  {v.item_nombre}
                  {v.talla && <span className="text-white/40"> · talla {v.talla}</span>}
                  {v.cantidad > 1 && <span className="text-white/40"> · x{v.cantidad}</span>}
                </div>
                <div className="text-xs text-white/30">{fmtFecha(v.created_at)}</div>
              </div>
              <span className="shrink-0 font-semibold text-brand">{fmt(v.total)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tile({ label, datos }) {
  return (
    <div className="rounded-xl border border-white/10 bg-brand-surface p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="font-display text-xl font-extrabold text-white">{fmt(datos.ingresos)}</p>
      <p className="text-xs text-white/40">{datos.piezas} pz</p>
    </div>
  );
}
