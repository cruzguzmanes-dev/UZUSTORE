"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const fmtFecha = (iso) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );

const ESTADO_ESTILO = {
  activo: "bg-brand/20 text-brand",
  completado: "bg-green-500/20 text-green-400",
  cancelado: "bg-white/10 text-white/40",
};

export default function ApartadosPage() {
  const [apartados, setApartados] = useState(null);
  const [estado, setEstado] = useState("activo");

  useEffect(() => {
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    fetch(`/api/admin/apartados?${params}`)
      .then((r) => r.json())
      .then(setApartados);
  }, [estado]);

  const porCobrar = (apartados || [])
    .filter((a) => a.estado === "activo")
    .reduce((s, a) => s + (Number(a.total) - Number(a.pagado)), 0);

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-lg font-extrabold text-white">Apartados</h1>
        <Link href="/admin/apartados/nuevo" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          + Nuevo apartado
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-brand-surface p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Por cobrar (apartados activos)</p>
        <p className="font-display text-2xl font-extrabold text-white">{fmt(porCobrar)}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["activo", "Activos"],
          ["completado", "Completados"],
          ["cancelado", "Cancelados"],
          ["", "Todos"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setEstado(val)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              estado === val ? "bg-brand text-white" : "border border-white/15 text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!apartados ? (
        <p className="text-white/40">Cargando...</p>
      ) : apartados.length === 0 ? (
        <p className="text-white/40">Sin apartados en esta vista.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {apartados.map((a) => {
            const restante = Number(a.total) - Number(a.pagado);
            return (
              <Link
                key={a.id}
                href={`/admin/apartados/${a.id}`}
                className="rounded-xl border border-white/10 p-3 hover:border-brand/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{a.cliente_nombre}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ESTADO_ESTILO[a.estado]}`}>
                    {a.estado}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-white/40">
                  {(a.apartado_lineas || [])
                    .map((l, i) => `${l.item_nombre}${l.talla ? ` (${l.talla})` : ""}${l.cantidad > 1 ? ` x${l.cantidad}` : ""}`)
                    .join(", ")}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">{fmtFecha(a.created_at)}</span>
                  <span>
                    <span className="text-white/40">{fmt(a.pagado)} de {fmt(a.total)}</span>
                    {a.estado === "activo" && <span className="ml-2 font-semibold text-brand">falta {fmt(restante)}</span>}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
