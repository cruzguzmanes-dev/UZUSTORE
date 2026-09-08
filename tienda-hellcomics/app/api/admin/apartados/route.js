import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { resolverLineas, descontarStock } from "@/lib/lineasHelpers";

// GET /api/admin/apartados?estado= -- lista para el panel
export async function GET(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const db = supabaseAdmin();
  let query = db
    .from("apartados")
    .select("*, apartado_lineas(item_nombre,talla,cantidad)")
    .order("created_at", { ascending: false });
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/apartados -- crea un apartado: resta stock de cada línea (igual que una
// venta) y, si dan anticipo, lo registra como primer abono (incluyendo el historial de
// ventas general).
// body: { cliente_nombre, cliente_telefono, lineas: [...], total, anticipo? }
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const cliente_nombre = (body.cliente_nombre || "").trim();
  const cliente_telefono = (body.cliente_telefono || "").trim();
  if (!cliente_nombre) return NextResponse.json({ error: "Falta el nombre del comprador" }, { status: 400 });
  if (!cliente_telefono) return NextResponse.json({ error: "Falta el teléfono del comprador" }, { status: 400 });

  const lineasBody = Array.isArray(body.lineas) ? body.lineas : [];
  if (lineasBody.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
  }

  const total = body.total != null && body.total !== "" ? parseFloat(body.total) : NaN;
  if (isNaN(total) || total < 0) {
    return NextResponse.json({ error: "Ingresa el total del apartado" }, { status: 400 });
  }

  const anticipo = body.anticipo != null && body.anticipo !== "" ? parseFloat(body.anticipo) : 0;
  if (isNaN(anticipo) || anticipo < 0) {
    return NextResponse.json({ error: "Anticipo inválido" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { resueltas, subtotal, error: errorLineas } = await resolverLineas(db, lineasBody);
  if (errorLineas) return NextResponse.json({ error: errorLineas }, { status: 400 });

  const estadoInicial = total > 0 && anticipo >= total ? "completado" : "activo";

  const { data: apartado, error: errApartado } = await db
    .from("apartados")
    .insert({
      cliente_nombre,
      cliente_telefono,
      subtotal,
      total,
      pagado: anticipo,
      estado: estadoInicial,
    })
    .select()
    .single();
  if (errApartado) return NextResponse.json({ error: errApartado.message }, { status: 500 });

  await descontarStock(db, resueltas);

  const lineasInsert = resueltas.map((r) =>
    r.libre
      ? {
          apartado_id: apartado.id,
          item_id: null,
          item_nombre: r.nombre,
          talla: null,
          cantidad: r.cantidad,
          precio_unitario: r.precio,
          total: r.totalLinea,
        }
      : {
          apartado_id: apartado.id,
          item_id: r.item.id,
          item_nombre: r.item.nombre,
          talla: r.talla,
          cantidad: r.cantidad,
          precio_unitario: r.item.precio,
          total: r.totalLinea,
        }
  );
  await db.from("apartado_lineas").insert(lineasInsert);

  if (anticipo > 0) {
    await db.from("apartado_abonos").insert({ apartado_id: apartado.id, monto: anticipo });
    await db.from("ventas").insert({
      item_id: null,
      item_nombre: `Abono de apartado - ${cliente_nombre}`,
      talla: null,
      cantidad: 1,
      precio_unitario: anticipo,
      total: anticipo,
    });
  }

  return NextResponse.json({ apartado });
}
