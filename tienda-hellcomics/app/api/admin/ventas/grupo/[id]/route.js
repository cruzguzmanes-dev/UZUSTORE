import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { restaurarStock } from "@/lib/lineasHelpers";

// DELETE /api/admin/ventas/grupo/:id -- cancela una venta combinada completa: regresa el
// stock de cada línea (si aplica) y borra tanto las líneas como el grupo del historial.
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data: grupo } = await db.from("venta_grupos").select("id").eq("id", params.id).maybeSingle();
  if (!grupo) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const { data: lineas } = await db.from("ventas").select("*").eq("grupo_id", params.id);
  await restaurarStock(db, lineas || []);

  await db.from("ventas").delete().eq("grupo_id", params.id);
  const { error } = await db.from("venta_grupos").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
