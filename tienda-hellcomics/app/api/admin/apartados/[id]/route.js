import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { restaurarStock } from "@/lib/lineasHelpers";

// GET /api/admin/apartados/:id -- detalle completo (líneas + abonos)
export async function GET(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data: apartado, error } = await db.from("apartados").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!apartado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [{ data: lineas }, { data: abonos }] = await Promise.all([
    db.from("apartado_lineas").select("*").eq("apartado_id", params.id),
    db.from("apartado_abonos").select("*").eq("apartado_id", params.id).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ ...apartado, lineas: lineas || [], abonos: abonos || [] });
}

// PATCH /api/admin/apartados/:id -- dos acciones posibles:
//   { monto } -- registra un abono (suma a "pagado", se completa solo si alcanza el
//     total, y también queda en el historial de ventas general)
//   { cancelar: true } -- regresa el stock de las líneas reservadas y marca cancelado
export async function PATCH(req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const { data: apartado } = await db.from("apartados").select("*").eq("id", params.id).maybeSingle();
  if (!apartado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (body.cancelar) {
    if (apartado.estado !== "activo") {
      return NextResponse.json({ error: "Solo se puede cancelar un apartado activo" }, { status: 400 });
    }
    const { data: lineas } = await db.from("apartado_lineas").select("*").eq("apartado_id", apartado.id);
    await restaurarStock(db, lineas || []);

    const { data: actualizado, error } = await db
      .from("apartados")
      .update({ estado: "cancelado" })
      .eq("id", apartado.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(actualizado);
  }

  if (body.monto != null) {
    if (apartado.estado !== "activo") {
      return NextResponse.json({ error: "Este apartado ya no está activo" }, { status: 400 });
    }
    const monto = parseFloat(body.monto);
    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json({ error: "Ingresa un monto válido" }, { status: 400 });
    }

    const nuevoPagado = Number(apartado.pagado) + monto;
    const nuevoEstado = nuevoPagado >= Number(apartado.total) ? "completado" : "activo";

    await db.from("apartado_abonos").insert({ apartado_id: apartado.id, monto });
    await db.from("ventas").insert({
      item_id: null,
      item_nombre: `Abono de apartado - ${apartado.cliente_nombre}`,
      talla: null,
      cantidad: 1,
      precio_unitario: monto,
      total: monto,
    });

    const { data: actualizado, error } = await db
      .from("apartados")
      .update({ pagado: nuevoPagado, estado: nuevoEstado })
      .eq("id", apartado.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(actualizado);
  }

  return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
}
