import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// PUT { ids: [3, 1, 2] } -- fija el orden de las secciones en el Home según la posición
// en el arreglo (índice 0 = más arriba).
export async function PUT(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids)) return NextResponse.json({ error: "Falta el orden" }, { status: 400 });

  const db = supabaseAdmin();
  for (let i = 0; i < ids.length; i++) {
    await db.from("secciones").update({ orden: i }).eq("id", ids[i]);
  }
  return NextResponse.json({ ok: true });
}
