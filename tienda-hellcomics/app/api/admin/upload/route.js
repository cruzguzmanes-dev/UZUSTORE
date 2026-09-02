import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB de margen -- el cliente ya comprime antes de mandar

// POST /api/admin/upload -- FormData con "file". Sube a Supabase Storage server-side
// (el navegador nunca tiene una key de Supabase) y devuelve la URL pública.
export async function POST(req) {
  const guard = requireAdmin();
  if (guard) return guard;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json({ error: "Formato no soportado (usa JPEG, PNG o WebP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen es muy pesada" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await db.storage.from("items").upload(nombreArchivo, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data } = db.storage.from("items").getPublicUrl(nombreArchivo);
  return NextResponse.json({ url: data.publicUrl });
}
