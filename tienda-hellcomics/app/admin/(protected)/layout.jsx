import { redirect } from "next/navigation";
import Link from "next/link";
import { sesionAdminValida } from "@/lib/adminGuard";
import LogoutButton from "@/components/admin/LogoutButton";

export default function AdminProtectedLayout({ children }) {
  if (!sesionAdminValida()) redirect("/admin");

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="border-b border-white/10 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1">
            <NavLink href="/admin/items">Items</NavLink>
            <NavLink href="/admin/categorias">Categorías</NavLink>
            <NavLink href="/admin/ventas">Ventas</NavLink>
            <NavLink href="/admin/estadisticas">Estadísticas</NavLink>
            <NavLink href="/admin/config">Config</NavLink>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
