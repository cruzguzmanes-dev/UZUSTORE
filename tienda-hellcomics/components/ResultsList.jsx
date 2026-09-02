"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ItemCard from "./ItemCard";

const PAGE_SIZE = 10;

export default function ResultsList({ q, categoria }) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(false);
  const sentinelRef = useRef(null);

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

  if (items.length === 0 && !cargando) {
    return <p className="py-16 text-center text-white/50">Sin resultados.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {cargando && <p className="py-6 text-center text-sm text-white/40">Cargando...</p>}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
