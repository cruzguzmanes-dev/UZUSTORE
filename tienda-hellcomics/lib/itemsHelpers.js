import { slugify } from "./slugify";

// Si mandan categoria_id, se usa tal cual. Si mandan categoria_nueva (texto libre), se
// busca una existente con ese nombre (case-insensitive) o se crea al vuelo -- mismo
// patrón que "crear figura al vuelo" del dashboard principal (src/tabs/Almacen.jsx).
export async function resolverCategoria(db, body) {
  if (body.categoria_id) return body.categoria_id;
  const nombre = (body.categoria_nueva || "").trim();
  if (!nombre) return null;

  const { data: existente } = await db
    .from("categorias")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: nueva } = await db
    .from("categorias")
    .insert({ nombre, slug: slugify(nombre) })
    .select()
    .single();
  return nueva?.id ?? null;
}

// Reemplaza el set de tags de un item. Cada palabra ya viene separada del lado del
// cliente (TagInput divide por espacio); aquí solo se hace find-or-create por nombre.
export async function guardarTags(db, itemId, tagNombres) {
  await db.from("item_tags").delete().eq("item_id", itemId);
  const nombres = [...new Set((tagNombres || []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
  for (const nombre of nombres) {
    let { data: tag } = await db.from("tags").select("id").eq("nombre", nombre).maybeSingle();
    if (!tag) {
      const { data: nuevo } = await db.from("tags").insert({ nombre }).select().single();
      tag = nuevo;
    }
    if (tag) await db.from("item_tags").insert({ item_id: itemId, tag_id: tag.id });
  }
}

// Reemplaza el set de imágenes de un item, en el orden recibido (la primera = portada).
export async function guardarImagenes(db, itemId, urls) {
  await db.from("imagenes").delete().eq("item_id", itemId);
  const rows = (urls || []).map((url, orden) => ({ item_id: itemId, url, orden }));
  if (rows.length) await db.from("imagenes").insert(rows);
}
