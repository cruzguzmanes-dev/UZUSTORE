import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { resolverLineas, descontarStock } from "@/lib/lineasHelpers";

// POST /api/admin/ventas/grupo -- venta de varios productos juntos con un total propio
// (para cuando se hace descuento sobre el conjunto, ej. $2500 de lista → se cobran $2300).
// body: { lineas: [{ item_id, talla?, cantidad } | { nombre, precio, cantidad }], total }
// La segunda forma (nombre + precio, sin item_id) es para inventario que todavía no está
// cargado como item en el catálogo -- se registra en el historial tal cual, sin tocar
// stock de nada (no hay a quién restárselo).
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const lineasBody = Array.isArray(body.lineas) ? body.lineas : [];
  if (lineasBody.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
  }
  const totalCobrado = body.total != null && body.total !== "" ? parseFloat(body.total) : NaN;
  if (isNaN(totalCobrado) || totalCobrado < 0) {
    return NextResponse.json({ error: "Ingresa el total cobrado" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { resueltas, subtotal, error: errorLineas } = await resolverLineas(db, lineasBody);
  if (errorLineas) return NextResponse.json({ error: errorLineas }, { status: 400 });

  const { data: grupo, error: errGrupo } = await db
    .from("venta_grupos")
    .insert({ subtotal, total: totalCobrado })
    .select()
    .single();
  if (errGrupo) return NextResponse.json({ error: errGrupo.message }, { status: 500 });

  await descontarStock(db, resueltas);

  const ventasInsert = resueltas.map((r) =>
    r.libre
      ? {
          grupo_id: grupo.id,
          item_id: null,
          item_nombre: r.nombre,
          talla: null,
          cantidad: r.cantidad,
          precio_unitario: r.precio,
          total: r.totalLinea,
        }
      : {
          grupo_id: grupo.id,
          item_id: r.item.id,
          item_nombre: r.item.nombre,
          talla: r.talla,
          cantidad: r.cantidad,
          precio_unitario: r.item.precio,
          total: r.totalLinea,
        }
  );
  await db.from("ventas").insert(ventasInsert);

  return NextResponse.json({ grupo });
}
