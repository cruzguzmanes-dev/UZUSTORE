import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

// GET: nunca devuelve el hash ni el código -- solo lo que el panel necesita mostrar/editar.
export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;
  const db = supabaseAdmin();
  const { data, error } = await db.from("config").select("whatsapp_numero").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ whatsapp_numero: data?.whatsapp_numero || "" });
}

// PUT { whatsapp_numero?, nuevo_codigo? } -- nuevo_codigo se hashea aquí, nunca se guarda en texto plano.
export async function PUT(req) {
  const guard = requireAdmin();
  if (guard) return guard;
  const { whatsapp_numero, nuevo_codigo } = await req.json().catch(() => ({}));

  const patch = {};
  if (whatsapp_numero !== undefined) patch.whatsapp_numero = String(whatsapp_numero).replace(/[^0-9]/g, "");
  if (nuevo_codigo) {
    if (nuevo_codigo.length < 8) {
      return NextResponse.json({ error: "El código debe tener al menos 8 caracteres" }, { status: 400 });
    }
    patch.acceso_admin_hash = await bcrypt.hash(nuevo_codigo, 10);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("config").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
