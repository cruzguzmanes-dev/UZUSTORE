"use client";

import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => {
        setWhatsapp(d.whatsapp_numero || "");
        setDireccion(d.direccion || "");
        setInstagram(d.instagram_url || "");
        setFacebook(d.facebook_url || "");
      });
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    const body = {
      whatsapp_numero: whatsapp,
      direccion,
      instagram_url: instagram,
      facebook_url: facebook,
    };
    if (nuevoCodigo) body.nuevo_codigo = nuevoCodigo;

    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNuevoCodigo("");
    setMensaje("Guardado.");
  };

  return (
    <form onSubmit={guardar} className="max-w-sm">
      <h1 className="mb-5 font-display text-lg font-extrabold text-white">Configuración</h1>

      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
        Número de WhatsApp (con código de país, sin +)
      </label>
      <input
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="5215512345678"
        className="mb-5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
      />

      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Dirección</label>
      <input
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        placeholder="Av. Universidad 790, sótano 1, Local 6..."
        className="mb-5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
      />

      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Link de Instagram</label>
      <input
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="https://www.instagram.com/..."
        className="mb-5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
      />

      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Link de Facebook</label>
      <input
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
        placeholder="https://www.facebook.com/..."
        className="mb-5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
      />

      <p className="mb-5 text-xs text-white/30">
        Estos datos (redes + dirección) se muestran discretos al final del Home.
      </p>

      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
        Cambiar código de acceso (dejar vacío para no cambiarlo)
      </label>
      <input
        type="text"
        autoComplete="off"
        value={nuevoCodigo}
        onChange={(e) => setNuevoCodigo(e.target.value)}
        placeholder="Nuevo código (mínimo 8 caracteres)"
        className="mb-5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
      />

      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}
      {mensaje && <p className="mb-4 text-sm text-green-400">✓ {mensaje}</p>}

      <button type="submit" className="rounded-lg bg-brand px-6 py-2.5 font-display font-bold text-white">
        Guardar →
      </button>
    </form>
  );
}
