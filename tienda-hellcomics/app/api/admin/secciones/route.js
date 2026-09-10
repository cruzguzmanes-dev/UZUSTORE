import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

const conImgs = (it) => ({ ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) });

// GET /api/admin/secciones -- todas las secciones con sus items, para el panel.
// Para la sección 'novedades': `items` es la lista automática (más nuevos, ya sin los
// excluidos) y `excluidos` los que el admin ocultó.
export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("secciones")
    .select(
      "id, nombre, orden, activa, tipo, seccion_items(orden, item_id, items(id, nombre, precio, estado, publico, imagenes(url, orden)))"
    )
    .order("orden");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hayNovedades = (data || []).some((s) => s.tipo === "novedades");
  let novedadesItems = [];
  if (hayNovedades) {
    const { data: nv } = await db
      .from("items")
      .select("id, nombre, precio, estado, publico, imagenes(url, orden)")
      .neq("estado", "oculto")
      .eq("publico", true)
      .order("created_at", { ascending: false })
      .limit(40);
    novedadesItems = nv || [];
  }

  const secciones = (data || []).map((s) => {
    if (s.tipo === "novedades") {
      const excluidosIds = new Set((s.seccion_items || []).map((si) => si.item_id));
      return {
        id: s.id,
        nombre: s.nombre,
        orden: s.orden,
        activa: s.activa,
        tipo: "novedades",
        items: novedadesItems.filter((it) => !excluidosIds.has(it.id)).map(conImgs),
        excluidos: (s.seccion_items || []).map((si) => si.items).filter(Boolean).map(conImgs),
      };
    }
    return {
      id: s.id,
      nombre: s.nombre,
      orden: s.orden,
      activa: s.activa,
      tipo: "manual",
      items: (s.seccion_items || [])
        .sort((a, b) => a.orden - b.orden)
        .map((si) => si.items)
        .filter(Boolean)
        .map(conImgs),
      excluidos: [],
    };
  });
  return NextResponse.json(secciones);
}

// POST { nombre } -- crea una sección manual al final
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { nombre } = await req.json().catch(() => ({}));
  if (!nombre?.trim()) return NextResponse.json({ error: "Ponle un nombre a la sección" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: ultima } = await db
    .from("secciones")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("secciones")
    .insert({ nombre: nombre.trim(), orden: (ultima?.orden ?? -1) + 1 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
