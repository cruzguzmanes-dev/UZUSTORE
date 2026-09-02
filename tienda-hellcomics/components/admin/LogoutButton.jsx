"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const salir = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  };
  return (
    <button onClick={salir} className="text-sm text-white/40 hover:text-white/70">
      Salir
    </button>
  );
}
