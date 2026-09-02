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
  if (!body.nombre?.trim() || body.precio == null || body.precio === "") {
    return NextResponse.json({ error: "Nombre y precio son requeridos" }, { status: 400 });
  }
  if (!body.imagenes || body.imagenes.length === 0) {
    return NextResponse.json({ error: "Agrega al menos una foto" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const categoria_id = await resolverCategoria(db, body);

  // El nombre sí se puede editar -- lo que nunca se toca es el slug (se generó una
  // sola vez al crear el item, en el POST), para que el link no se rompa.
  const { data: item, error } = await db
    .from("items")
    .update({
      nombre: body.nombre.trim(),
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

// PATCH /api/admin/items/:id -- ediciones rápidas desde la lista (stock +/-, toggle de
// estado, toggle de destacado)
export async function PATCH(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const patch = {};
  if (body.stock !== undefined) patch.stock = Math.max(0, parseInt(body.stock, 10) || 0);
  if (body.estado !== undefined) patch.estado = body.estado;
  if (body.destacado !== undefined) {
    if (body.destacado) {
      // Límite de 20 destacados a la vez -- se checa en el servidor (no en lo que esté
      // filtrado/cargado del lado del cliente, que puede no reflejar el total real).
      const { count } = await db
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("destacado", true);
      if ((count || 0) >= 20) {
        return NextResponse.json(
          { error: "Ya tienes 20 productos en destacados (el máximo) -- quita alguno primero." },
          { status: 400 }
        );
      }
    }
    patch.destacado = !!body.destacado;
    patch.destacado_at = body.destacado ? new Date().toISOString() : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

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
