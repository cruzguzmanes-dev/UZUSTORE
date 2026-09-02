import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { resolverCategoria, guardarTags, guardarImagenes } from "@/lib/itemsHelpers";

// GET /api/admin/items/:id -- detalle completo para el formulario de edición
export async function GET(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .select("*, categorias(id,nombre), imagenes(id,url,orden), item_tags(tags(id,nombre))")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    ...data,
    imagenes: (data.imagenes || []).sort((a, b) => a.orden - b.orden),
    tags: (data.item_tags || []).map((t) => t.tags?.nombre).filter(Boolean),
  });
}

// PUT /api/admin/items/:id -- guardar el formulario completo (nombre, precio, tags, imágenes, etc.)
export async function PUT(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  if (body.precio == null || body.precio === "") {
    return NextResponse.json({ error: "El precio es requerido" }, { status: 400 });
  }
  if (!body.imagenes || body.imagenes.length === 0) {
    return NextResponse.json({ error: "Agrega al menos una foto" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const categoria_id = await resolverCategoria(db, body);

  // El nombre nunca se toca aquí a propósito -- ya generó el link del producto al
  // crearse, y el panel deja el campo bloqueado en edición para no romper links
  // compartidos. Aunque llegara un "nombre" distinto en el body, se ignora.
  const { data: item, error } = await db
    .from("items")
    .update({
      descripcion: body.descripcion?.trim() || null,
      precio: parseFloat(body.precio),
      costo: body.costo != null && body.costo !== "" ? parseFloat(body.costo) : null,
      stock: parseInt(body.stock, 10) || 0,
      categoria_id,
      estado: body.estado || "activo",
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.tags) await guardarTags(db, item.id, body.tags);
  if (body.imagenes) await guardarImagenes(db, item.id, body.imagenes);

  return NextResponse.json(item);
}

// PATCH /api/admin/items/:id -- ediciones rápidas desde la lista (stock +/-, toggle de estado)
export async function PATCH(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const patch = {};
  if (body.stock !== undefined) patch.stock = Math.max(0, parseInt(body.stock, 10) || 0);
  if (body.estado !== undefined) patch.estado = body.estado;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from("items").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/admin/items/:id
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { error } = await db.from("items").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
