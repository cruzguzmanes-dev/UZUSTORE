import { supabaseAdmin } from "./supabaseAdmin";

// Datos públicos de contacto (whatsapp, redes, dirección) -- nunca acceso_admin_hash.
export async function getConfigPublica() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("config")
    .select("whatsapp_numero, direccion, instagram_url, facebook_url")
    .eq("id", 1)
    .maybeSingle();
  return {
    whatsapp_numero: data?.whatsapp_numero || process.env.WHATSAPP_NUMERO_DEFAULT || "",
    direccion: data?.direccion || "",
    instagram_url: data?.instagram_url || "",
    facebook_url: data?.facebook_url || "",
  };
}
