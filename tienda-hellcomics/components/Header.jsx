"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import VisitTracker from "./VisitTracker";

// Fijo arriba (sticky) para que siempre quede a la mano al hacer scroll. En el Home se ve
// completo (logo + buscador); en cualquier otra página se simplifica a solo una flecha
// para regresar + el buscador, para dejarle más espacio al contenido y que sea claro cómo
// volver -- típico de una app instalada (PWA), no tanto de una página web normal.
export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const esHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark px-4 py-4 sm:px-8">
      <VisitTracker />
      {esHome ? (
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-white">
            <span className="bg-gradient-to-r from-brand-flame-start via-brand to-brand-flame-end bg-clip-text text-transparent">
              Hell Comics
            </span>{" "}
            México
          </Link>
          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
            <SearchBar />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Regresar"
            className="shrink-0 text-2xl font-bold leading-none text-brand"
          >
            ←
          </button>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      )}
    </header>
  );
}
