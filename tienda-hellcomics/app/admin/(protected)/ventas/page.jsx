"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [confirmando, setConfirmando] = useState(false);
  const [textoConfirm, setTextoConfirm] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState("");

  const cargar = () => fetch("/api/admin/ventas").then((r) => r.json()).then(setDatos);

  useEffect(() => {
    cargar();
  }, []);

  const borrarHistorial = async () => {
    setBorrando(true);
    setErrorBorrar("");
    try {
      const res = await fetch("/api/admin/ventas", { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo borrar el historial");
      setConfirmando(false);
      setTextoConfirm("");
      await cargar();
    } catch (err) {
      setErrorBorrar(err.message);
    } finally {
      setBorrando(false);
    }
  };

  if (!datos) return <p className="text-white/40">Cargando...</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-lg font-extrabold text-white">Ventas</h1>
        <Link
          href="/admin/ventas/nueva"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
        >
          + Nueva venta
        </Link>
      </div>
      <p className="mb-6 text-xs text-white/40">
        El botón "Vender" de cada item en la lista es para una venta rápida a precio de lista.
        "Nueva venta" es para combinar varios productos en una sola transacción con un total propio
        (por ejemplo, con descuento).
      </p>

      <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        {!confirmando ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              ¿Terminaste de probar? Puedes borrar todo el historial de ventas para empezar limpio.
            </p>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
            >
              Borrar historial de ventas
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-red-400">
              Esto borra TODO el historial de ventas para siempre (no se puede deshacer). El stock de los items no se
              toca -- si tus pruebas también movieron stock, ajústalo aparte en Items. Escribe <b>BORRAR</b> para
              confirmar.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={textoConfirm}
                onChange={(e) => setTextoConfirm(e.target.value)}
                placeholder="BORRAR"
                className="w-32 rounded-lg border border-red-500/30 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
              />
              <button
                type="button"
                onClick={borrarHistorial}
                disabled={textoConfirm !== "BORRAR" || borrando}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {borrando ? "Borrando..." : "Confirmar borrado"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  setTextoConfirm("");
                  setErrorBorrar("");
                }}
                className="rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white"
              >
                Cancelar
              </button>
            </div>
            {errorBorrar && <p className="mt-2 text-sm text-red-400">⚠ {errorBorrar}</p>}
          </div>
        )}
      </div>

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
          datos.recientes.map((v) =>
            v.tipo === "grupo" && v.lineas.length > 1 ? (
              <div key={v.id} className="border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">
                    Venta combinada
                    <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
                      {v.lineas.length} productos
                    </span>
                  </span>
                  <span className="font-semibold text-brand">{fmt(v.total)}</span>
                </div>
                <div className="mt-0.5 text-xs text-white/40">
                  {v.lineas.map((l, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      {l.item_nombre}
                      {l.talla && ` (${l.talla})`}
                      {l.cantidad > 1 && ` x${l.cantidad}`}
                    </span>
                  ))}
                </div>
                <div className="mt-0.5 text-xs text-white/30">
                  {fmtFecha(v.created_at)}
                  {Number(v.subtotal) !== Number(v.total) && (
                    <span> · lista {fmt(v.subtotal)} → descuento {fmt(v.subtotal - v.total)}</span>
                  )}
                </div>
              </div>
            ) : (
              // Venta normal (o un "grupo" de un solo producto -- ej. una venta libre sin
              // catálogo desde "Nueva venta" -- se ve igual, no tiene caso llamarla "combinada").
              <div key={v.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-white/80">
                    {v.tipo === "grupo" ? v.lineas[0]?.item_nombre : v.item_nombre}
                    {(v.tipo === "grupo" ? v.lineas[0]?.talla : v.talla) && (
                      <span className="text-white/40"> · talla {v.tipo === "grupo" ? v.lineas[0].talla : v.talla}</span>
                    )}
                    {(v.tipo === "grupo" ? v.lineas[0]?.cantidad : v.cantidad) > 1 && (
                      <span className="text-white/40"> · x{v.tipo === "grupo" ? v.lineas[0].cantidad : v.cantidad}</span>
                    )}
                  </div>
                  <div className="text-xs text-white/30">
                    {fmtFecha(v.created_at)}
                    {v.tipo === "grupo" && Number(v.subtotal) !== Number(v.total) && (
                      <span> · lista {fmt(v.subtotal)} → descuento {fmt(v.subtotal - v.total)}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-semibold text-brand">{fmt(v.total)}</span>
              </div>
            )
          )
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
