import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

export async function PUT(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;
  const { nombre, orden } = await req.json().catch(() => ({}));

  const db = supabaseAdmin();
  const patch = {};
  if (nombre !== undefined) patch.nombre = nombre.trim();
  if (orden !== undefined) patch.orden = orden;

  const { data, error } = await db.from("categorias").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// Borrar una categoría no borra sus items -- se quedan sin categoría (on delete set null en el esquema).
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;
  const db = supabaseAdmin();
  const { error } = await db.from("categorias").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
