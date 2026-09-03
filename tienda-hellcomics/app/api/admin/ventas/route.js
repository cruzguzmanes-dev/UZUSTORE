import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

const TZ = "America/Mexico_City";

function inicioDe(diasAtras) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString();
}

function fechaMx(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso)
  );
}

// GET /api/admin/ventas -- ingresos hoy/semana/mes/total, ventas recientes y top vendidos (30 días)
export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();

  // Ingresos: las ventas sueltas (sin grupo) se cuentan por su total normal, pero las
  // que son parte de una venta combinada NO se suman línea por línea (eso duplicaría el
  // precio de lista) -- se cuenta una sola vez el total real cobrado en venta_grupos.
  const sumar = async (desde) => {
    let qSueltas = db.from("ventas").select("total, cantidad").is("grupo_id", null);
    let qGrupos = db.from("venta_grupos").select("total");
    let qPiezas = db.from("ventas").select("cantidad");
    if (desde) {
      qSueltas = qSueltas.gte("created_at", desde);
      qGrupos = qGrupos.gte("created_at", desde);
      qPiezas = qPiezas.gte("created_at", desde);
    }
    const [{ data: sueltas }, { data: grupos }, { data: piezas }] = await Promise.all([qSueltas, qGrupos, qPiezas]);
    return {
      ingresos:
        (sueltas || []).reduce((s, v) => s + Number(v.total), 0) + (grupos || []).reduce((s, g) => s + Number(g.total), 0),
      piezas: (piezas || []).reduce((s, v) => s + v.cantidad, 0),
    };
  };

  const [hoy, semana, mes, total] = await Promise.all([
    sumar(inicioDe(0)),
    sumar(inicioDe(6)),
    sumar(inicioDe(29)),
    sumar(null),
  ]);

  const { data: recientesSueltas } = await db
    .from("ventas")
    .select("id, item_nombre, talla, cantidad, total, created_at")
    .is("grupo_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: gruposRecientes } = await db
    .from("venta_grupos")
    .select("id, subtotal, total, created_at, ventas(item_nombre, talla, cantidad)")
    .order("created_at", { ascending: false })
    .limit(50);

  const recientes = [
    ...(recientesSueltas || []).map((v) => ({ tipo: "simple", id: `v${v.id}`, ...v })),
    ...(gruposRecientes || []).map((g) => ({
      tipo: "grupo",
      id: `g${g.id}`,
      subtotal: g.subtotal,
      total: g.total,
      created_at: g.created_at,
      lineas: g.ventas || [],
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);

  const { data: ultimoMes } = await db
    .from("ventas")
    .select("item_nombre, cantidad, total")
    .gte("created_at", inicioDe(29));

  const porItem = {};
  for (const v of ultimoMes || []) {
    porItem[v.item_nombre] ||= { nombre: v.item_nombre, piezas: 0, ingresos: 0 };
    porItem[v.item_nombre].piezas += v.cantidad;
    porItem[v.item_nombre].ingresos += Number(v.total);
  }
  const topVendidos = Object.values(porItem)
    .sort((a, b) => b.piezas - a.piezas)
    .slice(0, 10);

  return NextResponse.json({
    hoy,
    semana,
    mes,
    total,
    recientes: recientes.map((v) => ({ ...v, dia: fechaMx(v.created_at) })),
    topVendidos,
  });
}

// POST /api/admin/ventas -- registra una venta: resta stock (de la talla si aplica) y
// guarda el renglón del historial con el precio del momento.
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const cantidad = Math.max(1, parseInt(body.cantidad, 10) || 1);
  if (!body.item_id) return NextResponse.json({ error: "Falta el item" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: item, error: errItem } = await db
    .from("items")
    .select("id, nombre, precio, stock, tiene_tallas")
    .eq("id", body.item_id)
    .maybeSingle();
  if (errItem || !item) return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });

  let talla = null;

  if (item.tiene_tallas) {
    talla = (body.talla || "").trim();
    if (!talla) return NextResponse.json({ error: "Elige una talla" }, { status: 400 });

    const { data: variante } = await db
      .from("variantes")
      .select("id, stock")
      .eq("item_id", item.id)
      .eq("talla", talla)
      .maybeSingle();
    if (!variante) return NextResponse.json({ error: "Esa talla no existe para este item" }, { status: 400 });
    if (variante.stock < cantidad) {
      return NextResponse.json({ error: `Solo quedan ${variante.stock} en talla ${talla}` }, { status: 400 });
    }

    await db.from("variantes").update({ stock: variante.stock - cantidad }).eq("id", variante.id);

    const { data: todas } = await db.from("variantes").select("stock").eq("item_id", item.id);
    item.stock = (todas || []).reduce((s, v) => s + v.stock, 0);
    await db.from("items").update({ stock: item.stock }).eq("id", item.id);
  } else {
    if (item.stock < cantidad) {
      return NextResponse.json({ error: `Solo quedan ${item.stock} en stock` }, { status: 400 });
    }
    item.stock -= cantidad;
    await db.from("items").update({ stock: item.stock }).eq("id", item.id);
  }

  const { data: venta, error: errVenta } = await db
    .from("ventas")
    .insert({
      item_id: item.id,
      item_nombre: item.nombre,
      talla,
      cantidad,
      precio_unitario: item.precio,
      total: item.precio * cantidad,
    })
    .select()
    .single();
  if (errVenta) return NextResponse.json({ error: errVenta.message }, { status: 500 });

  return NextResponse.json({ venta, stock: item.stock });
}
