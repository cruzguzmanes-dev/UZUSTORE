import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { path } -- una fila por visita. Sin IP ni identificadores personales.
export async function POST(req) {
  const { path } = await req.json().catch(() => ({}));
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Falta path" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    await db.from("visitas").insert({ path: path.slice(0, 200) });
  } catch {
    // Si falla el registro de la visita, no debe romper la navegación del usuario.
  }
  return NextResponse.json({ ok: true });
}
