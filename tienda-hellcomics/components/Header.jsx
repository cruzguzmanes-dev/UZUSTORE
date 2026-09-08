"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import VisitTracker from "./VisitTracker";

// El header fijo (sticky) + la flecha de regreso solo aplican cuando el sitio corre como
// app instalada (PWA) -- en un navegador normal se queda tal cual como antes (header
// completo, sin fijar). Se detecta en el cliente si está en modo standalone: Android/
// Chrome vía matchMedia, iOS vía navigator.standalone (no hay forma de saberlo en el
// servidor, por eso arranca en false y se ajusta en el primer render).
export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const esHome = pathname === "/";
  const [esPWA, setEsPWA] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    setEsPWA(standalone);
  }, []);

  const simplificado = esPWA && !esHome;

  return (
    <header
      className={`border-b border-white/10 bg-brand-dark px-4 py-4 sm:px-8 ${esPWA ? "sticky top-0 z-40" : ""}`}
    >
      <VisitTracker />
      {simplificado ? (
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Regresar"
            className="shrink-0 rounded-lg p-1 text-brand hover:bg-white/5"
          >
            <IconoFlechaAtras />
          </button>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      ) : (
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
      )}
    </header>
  );
}

function IconoFlechaAtras() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
