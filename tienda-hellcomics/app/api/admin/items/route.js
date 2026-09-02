import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { slugUnico } from "@/lib/slugify";
import { resolverCategoria, guardarTags, guardarImagenes } from "@/lib/itemsHelpers";

// GET /api/admin/items?q=&categoria_id=&estado=  -- lista para el panel (todas las columnas, incluye costo)
export async function GET(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const categoria_id = searchParams.get("categoria_id");
  const estado = searchParams.get("estado");

  const db = supabaseAdmin();
  let query = db
    .from("items")
    .select("*, categorias(id,nombre), imagenes(url,orden)")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("nombre", `%${q}%`);
  if (categoria_id) query = query.eq("categoria_id", categoria_id);
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/items -- crear
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  if (!body.nombre?.trim() || body.precio == null || body.precio === "") {
    return NextResponse.json({ error: "Nombre y precio son requeridos" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const categoria_id = await resolverCategoria(db, body);

  const { data: existentes } = await db.from("items").select("slug");
  const slug = slugUnico(body.nombre, (existentes || []).map((e) => e.slug));

  const { data: item, error } = await db
    .from("items")
    .insert({
      nombre: body.nombre.trim(),
      slug,
      descripcion: body.descripcion?.trim() || null,
      precio: parseFloat(body.precio),
      costo: body.costo != null && body.costo !== "" ? parseFloat(body.costo) : null,
      stock: parseInt(body.stock, 10) || 0,
      categoria_id,
      estado: body.estado || "activo",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await guardarTags(db, item.id, body.tags || []);
  await guardarImagenes(db, item.id, body.imagenes || []);

  return NextResponse.json(item);
}
