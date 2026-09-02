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
  const { data: config } = await db.from("config").select("acceso_admin_hash").eq("id", 1).maybeSingle();

  const ok = config?.acceso_admin_hash
    ? await bcrypt.compare(codigo, config.acceso_admin_hash)
    : false;

  if (!ok) {
    await registrarFallo(ip, bloqueo.fallos || 0);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  await limpiarIntentos(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return res;
}
