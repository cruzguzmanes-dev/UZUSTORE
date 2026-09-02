import { createClient } from "@supabase/supabase-js";

// Único cliente de Supabase de todo el proyecto -- SIEMPRE server-side (rutas de API,
// Server Components). Usa la service_role key, que bypassa RLS. Nunca se importa desde
// un componente con "use client".
let client = null;

// Quita cualquier carácter que no sea ASCII imprimible (ej. viñetas "•", comillas
// "curvas", espacios raros de un copy-paste) -- una URL o un JWT reales nunca los
// llevan, así que es seguro limpiarlos en vez de tronar con un error críptico de fetch.
function limpiar(valor) {
  return (valor || "").replace(/[^\x20-\x7E]/g, "").trim();
}

export function supabaseAdmin() {
  if (client) return client;
  const url = limpiar(process.env.SUPABASE_URL);
  const key = limpiar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
