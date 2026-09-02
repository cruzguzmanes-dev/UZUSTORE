import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;
  const db = supabaseAdmin();
  const { data, error } = await db.from("categorias").select("*").order("orden").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;
  const { nombre, orden } = await req.json().catch(() => ({}));
  if (!nombre?.trim()) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("categorias")
    .insert({ nombre: nombre.trim(), slug: slugify(nombre), orden: orden || 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
