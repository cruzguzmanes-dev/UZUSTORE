import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { estaBloqueada, registrarFallo, limpiarIntentos, ipDeRequest } from "@/lib/rateLimit";

export async function POST(req) {
  const ip = ipDeRequest(req);
  const { codigo } = await req.json().catch(() => ({}));

  if (!codigo || typeof codigo !== "string") {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const bloqueo = await estaBloqueada(ip);
  if (bloqueo.bloqueada) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Intenta de nuevo más tarde." },
      { status: 429 }
    );
  }

  const db = supabaseAdmin();
  const { data: config, error: dbError } = await db
    .from("config")
    .select("acceso_admin_hash")
    .eq("id", 1)
    .maybeSingle();

  // Si la tabla config no se pudo leer (env vars mal puestas, tabla inexistente, etc.),
  // eso NO es "código incorrecto" -- decirlo tal cual para poder diagnosticarlo, y
  // dejarlo en el log del servidor (Vercel -> Logs) con el detalle real.
  if (dbError) {
    console.error("Error leyendo config en /api/admin/login:", dbError);
    return NextResponse.json(
      { error: `No se pudo conectar a la base de datos: ${dbError.message}` },
      { status: 500 }
    );
  }
  if (!config) {
    console.error("La tabla config no tiene la fila id=1 -- ¿se corrió la migración?");
    return NextResponse.json(
      { error: "No existe la fila de configuración (falta correr la migración)" },
      { status: 500 }
    );
  }

  const ok = await bcrypt.compare(codigo, config.acceso_admin_hash);

  if (!ok) {
    await registrarFallo(ip, bloqueo.fallos || 0);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  await limpiarIntentos(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return res;
}
