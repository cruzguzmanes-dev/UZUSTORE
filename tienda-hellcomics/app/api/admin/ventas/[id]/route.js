import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";
import { restaurarStock } from "@/lib/lineasHelpers";

// DELETE /api/admin/ventas/:id -- cancela una venta suelta (sin grupo): regresa el stock
// del producto (si aplica) y la borra del historial, como si nunca hubiera pasado.
export async function DELETE(_req, { params }) {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();
  const { data: venta } = await db.from("ventas").select("*").eq("id", params.id).maybeSingle();
  if (!venta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (venta.grupo_id) {
    return NextResponse.json(
      { error: "Esta venta es parte de una venta combinada -- cancélala desde ahí" },
      { status: 400 }
    );
  }
  // Los abonos de apartado también quedan en `ventas` (para que cuenten en los ingresos),
  // pero cancelarlos aquí dejaría al apartado con un "pagado" que ya no cuadra -- eso se
  // maneja desde el apartado mismo, no desde aquí.
  if (venta.item_nombre?.startsWith("Abono de apartado")) {
    return NextResponse.json(
      { error: "Es un abono de apartado -- para revertirlo, ve al apartado correspondiente" },
      { status: 400 }
    );
  }

  await restaurarStock(db, [venta]);
  const { error } = await db.from("ventas").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
