import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// GET /api/admin/items/codigo?codigo=XXXX -- busca qué item(s)/talla(s) tienen ese
// código de barras. Puede regresar varios candidatos si el código está repetido (pasa
// con inventario tan variado -- cómics viejos sin barcode real, códigos genéricos, etc.)
// para que la persona a cargo elija cuál era, en vez de asumir el primero que aparezca.
export async function GET(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const codigo = searchParams.get("codigo")?.trim();
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  const db = supabaseAdmin();

  const [{ data: itemsMatch }, { data: variantesMatch }] = await Promise.all([
    db.from("items").select("id, nombre, precio, tiene_tallas, stock").eq("codigo_barras", codigo),
    db.from("variantes").select("talla, stock, items(id, nombre, precio, tiene_tallas)").eq("codigo_barras", codigo),
  ]);

  const candidatos = [
    ...(itemsMatch || []).map((it) => ({
      item_id: it.id,
      nombre: it.nombre,
      precio: it.precio,
      tiene_tallas: it.tiene_tallas,
      talla: null,
      stock: it.stock,
    })),
    ...(variantesMatch || [])
      .filter((v) => v.items)
      .map((v) => ({
        item_id: v.items.id,
        nombre: v.items.nombre,
        precio: v.items.precio,
        tiene_tallas: true,
        talla: v.talla,
        stock: v.stock,
      })),
  ];

  return NextResponse.json({ candidatos });
}
