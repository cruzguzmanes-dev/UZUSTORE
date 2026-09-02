import { supabaseAdmin } from "./supabaseAdmin";

const MAX_FALLOS_LIBRES = 5; // a partir de aquí empieza el bloqueo
const BLOQUEO_BASE_MIN = 5;
const BLOQUEO_MAX_MIN = 60;

// ¿Esta IP está bloqueada ahora mismo por intentos fallidos de login?
export async function estaBloqueada(ip) {
  const db = supabaseAdmin();
  const { data } = await db.from("login_intentos").select("*").eq("ip", ip).maybeSingle();
  if (!data) return { bloqueada: false, fallos: 0 };
  if (data.bloqueado_hasta && new Date(data.bloqueado_hasta) > new Date()) {
    return { bloqueada: true, hasta: data.bloqueado_hasta };
  }
  return { bloqueada: false, fallos: data.fallos || 0 };
}

export async function registrarFallo(ip, fallosPrevios) {
  const db = supabaseAdmin();
  const fallos = fallosPrevios + 1;
  let bloqueado_hasta = null;
  if (fallos >= MAX_FALLOS_LIBRES) {
    const minutos = Math.min(BLOQUEO_BASE_MIN * (fallos - MAX_FALLOS_LIBRES + 1), BLOQUEO_MAX_MIN);
    bloqueado_hasta = new Date(Date.now() + minutos * 60 * 1000).toISOString();
  }
  await db.from("login_intentos").upsert({ ip, fallos, bloqueado_hasta });
}

export async function limpiarIntentos(ip) {
  const db = supabaseAdmin();
  await db.from("login_intentos").delete().eq("ip", ip);
}

export function ipDeRequest(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "desconocida";
}
