import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// POST /api/admin/ventas/grupo -- venta de varios productos juntos con un total propio
// (para cuando se hace descuento sobre el conjunto, ej. $2500 de lista → se cobran $2300).
// body: { lineas: [{ item_id, talla?, cantidad }], total }
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

  // Primero se valida y resuelve TODO (sin escribir nada) para poder rechazar limpio si
  // algo falla, en vez de dejar la venta a medias con solo unas líneas aplicadas.
  const resueltas = [];
  let subtotal = 0;

  for (const l of lineasBody) {
    const { data: item } = await db
      .from("items")
      .select("id, nombre, precio, stock, tiene_tallas")
      .eq("id", l.item_id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "Uno de los productos ya no existe" }, { status: 400 });

    const cantidad = Math.max(1, parseInt(l.cantidad, 10) || 1);
    let talla = null;
    let variante = null;

    if (item.tiene_tallas) {
      talla = (l.talla || "").trim();
      if (!talla) return NextResponse.json({ error: `Elige una talla para "${item.nombre}"` }, { status: 400 });
      const { data: v } = await db
        .from("variantes")
        .select("id, stock")
        .eq("item_id", item.id)
        .eq("talla", talla)
        .maybeSingle();
      if (!v) return NextResponse.json({ error: `Talla inválida para "${item.nombre}"` }, { status: 400 });
      if (v.stock < cantidad) {
        return NextResponse.json(
          { error: `Solo quedan ${v.stock} de "${item.nombre}" en talla ${talla}` },
          { status: 400 }
        );
      }
      variante = v;
    } else if (item.stock < cantidad) {
      return NextResponse.json({ error: `Solo quedan ${item.stock} de "${item.nombre}"` }, { status: 400 });
    }

    const totalLinea = item.precio * cantidad;
    subtotal += totalLinea;
    resueltas.push({ item, cantidad, talla, variante, totalLinea });
  }

  const { data: grupo, error: errGrupo } = await db
    .from("venta_grupos")
    .insert({ subtotal, total: totalCobrado })
    .select()
    .single();
  if (errGrupo) return NextResponse.json({ error: errGrupo.message }, { status: 500 });

  for (const r of resueltas) {
    let stockItem;
    if (r.variante) {
      await db.from("variantes").update({ stock: r.variante.stock - r.cantidad }).eq("id", r.variante.id);
      const { data: todas } = await db.from("variantes").select("stock").eq("item_id", r.item.id);
      stockItem = (todas || []).reduce((s, v) => s + v.stock, 0);
    } else {
      stockItem = r.item.stock - r.cantidad;
    }
    await db.from("items").update({ stock: stockItem }).eq("id", r.item.id);

    await db.from("ventas").insert({
      grupo_id: grupo.id,
      item_id: r.item.id,
      item_nombre: r.item.nombre,
      talla: r.talla,
      cantidad: r.cantidad,
      precio_unitario: r.item.precio,
      total: r.totalLinea,
    });
  }

  return NextResponse.json({ grupo });
}
