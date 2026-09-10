import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// PUT { item_ids: [12, 5, 8] } -- reemplaza la lista COMPLETA de items de la sección, en
// ese orden. Así una sola llamada cubre agregar, quitar y reordenar (el panel manda el
// arreglo entero cada vez que cambia algo).
export async function PUT(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { item_ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(item_ids)) {
    return NextResponse.json({ error: "Falta la lista de items" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const seccionId = Number(params.id);

  await db.from("seccion_items").delete().eq("seccion_id", seccionId);
  const filas = [...new Set(item_ids.map(Number).filter(Boolean))].map((item_id, orden) => ({
    seccion_id: seccionId,
    item_id,
    orden,
  }));
  if (filas.length) {
    const { error } = await db.from("seccion_items").insert(filas);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
