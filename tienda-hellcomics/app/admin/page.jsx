"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const entrar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo entrar");
      router.push("/admin/items");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-xl border border-white/10 bg-brand-surface p-6">
        <h1 className="mb-1 font-display text-lg font-extrabold text-white">Hell Comics México</h1>
        <p className="mb-5 text-sm text-white/50">Panel de administración</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Código de acceso</label>
        <input
          type="password"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoFocus
          className="mb-4 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        />

        {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-brand py-2.5 font-display font-bold text-white disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar →"}
        </button>
      </form>
    </div>
  );
}
