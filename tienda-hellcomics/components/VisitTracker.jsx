"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Invisible -- registra una visita cada vez que se monta (cada navegación real a una
// página pública). No se pone en el admin.
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/publico/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
