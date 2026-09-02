import { createClient } from "@supabase/supabase-js";

// Único cliente de Supabase de todo el proyecto -- SIEMPRE server-side (rutas de API,
// Server Components). Usa la service_role key, que bypassa RLS. Nunca se importa desde
// un componente con "use client".
let client = null;

export function supabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
