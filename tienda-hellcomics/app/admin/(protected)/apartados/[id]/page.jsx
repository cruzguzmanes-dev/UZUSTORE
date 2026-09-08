"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const fmtFecha = (iso) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const ESTADO_ESTILO = {
  activo: "bg-brand/20 text-brand",
  completado: "bg-green-500/20 text-green-400",
  cancelado: "bg-white/10 text-white/40",
};

export default function ApartadoDetallePage() {
  const { id } = useParams();
  const [apartado, setApartado] = useState(null);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const cargar = () => fetch(`/api/admin/apartados/${id}`).then((r) => r.json()).then(setApartado);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const registrarAbono = async (e) => {
    e.preventDefault();
    setError("");
    const val = parseFloat(monto);
    if (isNaN(val) || val <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/apartados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar el abono");
      setMonto("");
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async () => {
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/apartados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelar: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cancelar");
      setConfirmandoCancelar(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!apartado) return <p className="text-white/40">Cargando...</p>;
  if (apartado.error) return <p className="text-red-400">{apartado.error}</p>;

  const restante = Math.max(0, Number(apartado.total) - Number(apartado.pagado));

  return (
    <div className="max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-lg font-extrabold text-white">{apartado.cliente_nombre}</h1>
        <Link href="/admin/apartados" className="text-sm text-white/50 hover:text-brand">
          ← Apartados
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${ESTADO_ESTILO[apartado.estado]}`}>
          {apartado.estado}
        </span>
        <span className="text-sm text-white/50">📞 {apartado.cliente_telefono}</span>
        <span className="text-sm text-white/50">{fmtFecha(apartado.created_at)}</span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-brand-surface p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Total</p>
          <p className="font-display text-lg font-extrabold text-white">{fmt(apartado.total)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-brand-surface p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Pagado</p>
          <p className="font-display text-lg font-extrabold text-green-400">{fmt(apartado.pagado)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-brand-surface p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Falta</p>
          <p className="font-display text-lg font-extrabold text-brand">{fmt(restante)}</p>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-white/70">Productos apartados</h2>
      <div className="mb-6 rounded-xl border border-white/10">
        {(apartado.lineas || []).map((l) => (
          <div key={l.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
            <span className="text-white/80">
              {l.item_nombre}
              {l.talla && <span className="text-white/40"> · talla {l.talla}</span>}
              {l.cantidad > 1 && <span className="text-white/40"> · x{l.cantidad}</span>}
            </span>
            <span className="text-white/40">{fmt(l.total)}</span>
          </div>
        ))}
      </div>

      {apartado.estado === "activo" && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-white/70">Registrar abono</h2>
          <form onSubmit={registrarAbono} className="mb-6 flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder={`Máx. sugerido ${fmt(restante)}`}
              className="w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-brand"
            />
            <button
              type="submit"
              disabled={guardando}
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Abonar
            </button>
          </form>
        </>
      )}

      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

      <h2 className="mb-2 text-sm font-semibold text-white/70">Historial de abonos</h2>
      <div className="mb-6 rounded-xl border border-white/10">
        {(apartado.abonos || []).length === 0 ? (
          <p className="p-4 text-sm text-white/40">
            {apartado.estado === "activo" ? "Todavía no hay abonos registrados." : "Sin abonos."}
          </p>
        ) : (
          apartado.abonos.map((ab) => (
            <div key={ab.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
              <span className="text-white/50">{fmtFecha(ab.created_at)}</span>
              <span className="font-semibold text-green-400">{fmt(ab.monto)}</span>
            </div>
          ))
        )}
      </div>

      {apartado.estado === "activo" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          {!confirmandoCancelar ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/50">¿El cliente ya no lo quiere?</p>
              <button
                type="button"
                onClick={() => setConfirmandoCancelar(true)}
                className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                Cancelar apartado
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-red-400">
                Esto regresa el stock de los productos apartados (vuelven a estar disponibles) y marca el apartado
                como cancelado. Los abonos que ya recibiste NO se quitan del historial de ventas -- ese dinero ya
                entró.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={guardando}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {guardando ? "Cancelando..." : "Sí, cancelar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoCancelar(false)}
                  className="rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
