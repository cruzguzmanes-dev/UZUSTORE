"use client";

import { useState } from "react";
import Image from "next/image";

// imagenes: [{ url }] ya ordenadas (la primera es la portada).
export default function ProductGallery({ imagenes, nombre }) {
  const [indice, setIndice] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState(false);

  if (!imagenes.length) {
    return (
      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-brand-surface text-white/20">
        Sin foto
      </div>
    );
  }

  const abrir = (i) => {
    setIndice(i);
    setAbierto(true);
    setZoom(false);
  };

  const mover = (delta) => {
    setZoom(false);
    setIndice((i) => (i + delta + imagenes.length) % imagenes.length);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => abrir(indice)}
        className="relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-brand-surface"
      >
        <Image src={imagenes[indice].url} alt={nombre} fill className="object-cover" priority />
      </button>

      {imagenes.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {imagenes.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIndice(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                i === indice ? "border-brand" : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={nombre} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={() => setAbierto(false)}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAbierto(false);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            ✕
          </button>

          {imagenes.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  mover(-1);
                }}
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-4"
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  mover(1);
                }}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-4"
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </>
          )}

          <div className="flex h-full w-full items-center justify-center overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagenes[indice].url}
              alt={nombre}
              onDoubleClick={() => setZoom((z) => !z)}
              onClick={() => setZoom((z) => !z)}
              className={`select-none transition-transform duration-200 ${
                zoom ? "max-w-none scale-[2] cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"
              }`}
            />
          </div>

          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40">
            Toca la foto para acercar{imagenes.length > 1 && ` · ${indice + 1}/${imagenes.length}`}
          </p>
        </div>
      )}
    </div>
  );
}
