"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ItemCard from "./ItemCard";

const PAGE_SIZE = 10;
const VISTA_KEY = "hc_vista_grid"; // "2" o "1" columnas base (en localStorage, por dispositivo)

const GRID_2 = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const GRID_1 = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

export default function ResultsList({ q, categoria }) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState("2"); // "2" = más chico/más por fila, "1" = más grande
  const sentinelRef = useRef(null);

  // Recordar la preferencia de vista de este navegador (más útil para gente grande
  // que quiere dejarlo siempre en "1" y no tener que cambiarlo cada vez).
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(VISTA_KEY);
      if (guardada === "1" || guardada === "2") setVista(guardada);
    } catch {}
  }, []);

  const cambiarVista = (v) => {
    setVista(v);
    try { localStorage.setItem(VISTA_KEY, v); } catch {}
  };

  // Al cambiar de búsqueda/categoría, arrancar de cero.
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHayMas(true);
  }, [q, categoria]);

  const cargarSiguiente = useCallback(async () => {
    if (cargando || !hayMas) return;
    setCargando(true);
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (q) params.set("q", q);
      if (categoria) params.set("categoria", categoria);
      const res = await fetch(`/api/publico/resultados?${params}`);
      const data = await res.json();
      // Si el server devolvió un error ({error: "..."}), data no es un arreglo --
      // no crashear el render, solo dejar de pedir más.
      if (!res.ok || !Array.isArray(data)) {
        setHayMas(false);
        return;
      }
      setItems((prev) => [...prev, ...data]);
      setHayMas(data.length === PAGE_SIZE);
      setOffset((o) => o + data.length);
    } catch {
      setHayMas(false);
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, q, categoria, cargando, hayMas]);

  // Carga inicial (y cuando cambia q/categoria y offset se reseteó a 0).
  useEffect(() => {
    if (offset === 0 && items.length === 0 && hayMas) {
      cargarSiguiente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset === 0 && items.length === 0]);

  // Scroll infinito: cuando el sentinel entra en pantalla, pide la siguiente página.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) cargarSiguiente();
      },
      { rootMargin: "400px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [cargarSiguiente]);

  const sinResultados = items.length === 0 && !cargando;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1.5">
        <span className="mr-1 text-xs text-white/40">Ver:</span>
        <BotonVista activo={vista === "2"} onClick={() => cambiarVista("2")} aria-label="Vista chica, más por fila">
          <IconoGrid />
        </BotonVista>
        <BotonVista activo={vista === "1"} onClick={() => cambiarVista("1")} aria-label="Vista grande, uno por fila">
          <IconoLista />
        </BotonVista>
      </div>

      {sinResultados ? (
        <p className="py-16 text-center text-white/50">Sin resultados.</p>
      ) : (
        <div className={`grid gap-3 ${vista === "1" ? GRID_1 : GRID_2}`}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
      {cargando && <p className="py-6 text-center text-sm text-white/40">Cargando...</p>}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

function BotonVista({ activo, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-lg border p-1.5 transition ${
        activo ? "border-brand bg-brand/15 text-brand" : "border-white/15 text-white/40 hover:text-white/70"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

function IconoGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function IconoLista() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="16" height="7" rx="1.5" fill="currentColor" />
      <rect x="1" y="10" width="16" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}
