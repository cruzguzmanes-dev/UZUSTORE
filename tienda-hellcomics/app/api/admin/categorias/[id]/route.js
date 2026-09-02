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

// Si la categoría ya tiene items, no se deja borrar -- solo renombrar (arriba). Evita
// que un item se quede "sin categoría" sin querer por borrar la que estaba usando.
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;
  const db = supabaseAdmin();

  const { count, error: countError } = await db
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", params.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if (count > 0) {
    return NextResponse.json(
      { error: `Esta categoría tiene ${count} item(s) -- no se puede eliminar, solo renombrar.` },
      { status: 400 }
    );
  }

  const { error } = await db.from("categorias").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
