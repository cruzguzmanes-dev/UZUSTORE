import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// PATCH { nombre?, activa? } -- renombrar o prender/apagar la sección en el Home
export async function PATCH(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const patch = {};
  if (body.nombre !== undefined) {
    if (!body.nombre.trim()) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
    patch.nombre = body.nombre.trim();
  }
  if (body.activa !== undefined) patch.activa = !!body.activa;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from("secciones").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE -- borra la sección (sus seccion_items se van en cascada). La de Novedades no
// se puede borrar -- solo ocultarla.
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data: sec } = await db.from("secciones").select("tipo").eq("id", params.id).maybeSingle();
  if (sec?.tipo === "novedades") {
    return NextResponse.json(
      { error: "La sección de Novedades no se puede borrar -- puedes ocultarla si no la quieres mostrar." },
      { status: 400 }
    );
  }

  const { error } = await db.from("secciones").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
