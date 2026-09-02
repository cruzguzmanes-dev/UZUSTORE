import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";

// true/false -- para usar en Server Components (páginas) y en layouts.
export function sesionAdminValida() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

// Para usar dentro de rutas de API (app/api/admin/**/route.js): lanza una Response 401
// si la sesión no es válida, para poder hacer `const guard = requireAdmin(); if (guard) return guard;`
export function requireAdmin() {
  if (!sesionAdminValida()) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
