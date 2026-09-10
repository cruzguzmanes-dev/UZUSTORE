import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// GET /api/admin/secciones -- todas las secciones con sus items, para el panel
export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("secciones")
    .select("id, nombre, orden, activa, seccion_items(orden, items(id, nombre, precio, estado, publico, imagenes(url, orden)))")
    .order("orden");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const secciones = (data || []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    orden: s.orden,
    activa: s.activa,
    items: (s.seccion_items || [])
      .sort((a, b) => a.orden - b.orden)
      .map((si) => si.items)
      .filter(Boolean)
      .map((it) => ({ ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) })),
  }));
  return NextResponse.json(secciones);
}

// POST { nombre } -- crea una sección al final
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
