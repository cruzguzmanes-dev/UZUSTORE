import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Columnas seguras para exponer al público -- nunca "costo".
const SELECT_PUBLICO = "id,nombre,slug,precio,stock,estado,created_at,categorias(nombre,slug),imagenes(url,orden)";

function limpiar(rows) {
  return (rows || []).map((it) => ({
    ...it,
    imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden),
  }));
}

// GET /api/publico/resultados?q=texto  |  ?categoria=slug   (con &offset=)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categoriaSlug = searchParams.get("categoria")?.trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset"), 10) || 0);

  const db = supabaseAdmin();

  if (q) {
    // La función ya filtra estado='activo' y pagina de 10 en 10 -- pero devuelve solo
    // columnas de `items`, así que se re-consulta con el select público por los ids.
    const { data: base, error } = await db.rpc("buscar_items", { q, p_offset: offset });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!base?.length) return NextResponse.json([]);

    const ids = base.map((r) => r.id);
    const { data: full } = await db.from("items").select(SELECT_PUBLICO).in("id", ids);
    // Reordenar según el orden de relevancia que ya calculó buscar_items.
    const porId = new Map((full || []).map((r) => [r.id, r]));
    return NextResponse.json(limpiar(ids.map((id) => porId.get(id)).filter(Boolean)));
  }

  let query = db
    .from("items")
    .select(SELECT_PUBLICO)
    .eq("estado", "activo")
    .order("created_at", { ascending: false })
    .range(offset, offset + 9);

  if (categoriaSlug) {
    const { data: cat } = await db.from("categorias").select("id").eq("slug", categoriaSlug).maybeSingle();
    if (!cat) return NextResponse.json([]);
    query = query.eq("categoria_id", cat.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(limpiar(data));
}
