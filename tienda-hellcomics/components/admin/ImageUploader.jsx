"use client";

import { useRef, useState } from "react";

const MAX_LADO = 1200;
const CALIDAD = 0.8;

function comprimir(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(MAX_LADO / img.width, MAX_LADO / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", CALIDAD);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({ value = [], onChange }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const camaraRef = useRef(null);
  const galeriaRef = useRef(null);

  const subirArchivo = async (file) => {
    setError("");
    setSubiendo(true);
    try {
      const blob = await comprimir(file);
      const form = new FormData();
      form.append("file", blob, "foto.jpg");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error subiendo la imagen");
      onChange([...value, data.url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) subirArchivo(file);
  };

  const quitar = (url) => onChange(value.filter((u) => u !== url));

  const mover = (idx, dir) => {
    const nuevo = [...value];
    const otro = idx + dir;
    if (otro < 0 || otro >= nuevo.length) return;
    [nuevo[idx], nuevo[otro]] = [nuevo[otro], nuevo[idx]];
    onChange(nuevo);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {value.map((url, idx) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80">
                  Portada
                </span>
              )}
              <div className="absolute bottom-1 right-1 flex gap-1">
                {idx > 0 && (
                  <button type="button" onClick={() => mover(idx, -1)} className="h-5 w-5 rounded bg-black/70 text-[10px] text-white">
                    ←
                  </button>
                )}
                {idx < value.length - 1 && (
                  <button type="button" onClick={() => mover(idx, 1)} className="h-5 w-5 rounded bg-black/70 text-[10px] text-white">
                    →
                  </button>
                )}
                <button type="button" onClick={() => quitar(url)} className="h-5 w-5 rounded bg-black/70 text-[10px] text-white">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelected} />
      <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={subiendo}
          onClick={() => camaraRef.current?.click()}
          className="flex-1 rounded-lg border border-white/15 bg-black/30 py-2 text-sm text-white/80 disabled:opacity-50"
        >
          📷 Cámara
        </button>
        <button
          type="button"
          disabled={subiendo}
          onClick={() => galeriaRef.current?.click()}
          className="flex-1 rounded-lg border border-white/15 bg-black/30 py-2 text-sm text-white/80 disabled:opacity-50"
        >
          🖼️ Galería {value.length > 0 && "(agregar otra)"}
        </button>
      </div>

      {subiendo && <p className="mt-2 text-xs text-white/40">Subiendo...</p>}
      {error && <p className="mt-2 text-xs text-red-400">⚠ {error}</p>}
    </div>
  );
}
