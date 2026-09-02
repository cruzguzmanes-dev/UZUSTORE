"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ initialValue = "" }) {
  const [q, setQ] = useState(initialValue);
  const router = useRouter();

  const buscar = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/resultados?q=${encodeURIComponent(term)}`);
  };

  return (
    <form onSubmit={buscar} className="flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cómics..."
        className="w-full rounded-lg border border-white/15 bg-brand-surface px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
      >
        Buscar
      </button>
    </form>
  );
}
