import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import ProductGallery from "@/components/ProductGallery";
import TallaSelector from "@/components/TallaSelector";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { linkWhatsapp } from "@/lib/whatsapp";

export const revalidate = 60;

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

async function getItem(slug) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("items")
    .select(
      "id,nombre,slug,descripcion,precio,stock,estado,tiene_tallas,categorias(nombre,slug),imagenes(url,orden),item_tags(tags(id,nombre)),variantes(talla,stock,orden)"
    )
    .eq("slug", slug)
    .neq("estado", "oculto") // "agotado" sí se sigue mostrando (con menos detalle) -- solo "oculto" da 404
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    imagenes: (data.imagenes || []).sort((a, b) => a.orden - b.orden),
    tags: (data.item_tags || []).map((t) => t.tags).filter(Boolean),
    variantes: (data.variantes || []).sort((a, b) => a.orden - b.orden),
  };
}

async function getRelacionados(item) {
  if (!item.tags.length) return [];
  const db = supabaseAdmin();
  const tagIds = item.tags.map((t) => t.id);
  const { data } = await db
    .from("item_tags")
    .select("item_id, items(id,nombre,slug,precio,estado,imagenes(url,orden))")
    .in("tag_id", tagIds)
    .neq("item_id", item.id);

  const vistos = new Map();
  for (const row of data || []) {
    const it = row.items;
    if (it && it.estado === "activo" && !vistos.has(it.id)) {
      vistos.set(it.id, { ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) });
    }
  }
  return [...vistos.values()].slice(0, 10);
}

async function getWhatsapp() {
  const db = supabaseAdmin();
  const { data } = await db.from("config").select("whatsapp_numero").eq("id", 1).maybeSingle();
  return data?.whatsapp_numero || process.env.WHATSAPP_NUMERO_DEFAULT || "";
}

export async function generateMetadata({ params }) {
  const item = await getItem(params.slug);
  if (!item) return {};
  const imagen = item.imagenes[0]?.url;
  return {
    title: `${item.nombre} — Hell Comics México`,
    description: item.descripcion?.slice(0, 160) || `${item.nombre} — ${fmt(item.precio)}`,
    openGraph: {
      title: item.nombre,
      description: item.descripcion?.slice(0, 160),
      images: imagen ? [imagen] : [],
    },
  };
}

export default async function ProductoPage({ params }) {
  const item = await getItem(params.slug);
  if (!item) notFound();

  const [relacionados, whatsapp] = await Promise.all([getRelacionados(item), getWhatsapp()]);
  const urlProducto = `${process.env.SITE_URL || ""}/producto/${item.slug}`;
  // Para el aviso "Agotado" cuenta tanto el toggle manual como quedarse en 0 -- pero
  // solo el toggle manual (item.estado === "agotado", más abajo) esconde la parte de
  // tallas/inventario. Si se acabó solo por stock (con estado activo), las tallas se
  // siguen viendo con su desglose -- ahí sí es útil ver cuál sigue disponible.
  const agotado = item.estado === "agotado" || item.stock <= 0;

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <ProductGallery imagenes={item.imagenes} nombre={item.nombre} />
          </div>

          <div>
            {item.categorias?.nombre && (
              <div className="mb-2 text-xs uppercase tracking-wide text-white/50">{item.categorias.nombre}</div>
            )}
            <h1 className="font-display text-2xl font-extrabold text-white">{item.nombre}</h1>
            <div className="mt-2 font-display text-3xl font-extrabold text-brand">{fmt(item.precio)}</div>

            {agotado && (
              <div className="mt-3 inline-block rounded bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                Agotado
              </div>
            )}

            {item.descripcion && <p className="mt-4 whitespace-pre-line text-sm text-white/70">{item.descripcion}</p>}

            {item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t.id} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50">
                    {t.nombre}
                  </span>
                ))}
              </div>
            )}

            {item.tiene_tallas && item.estado !== "agotado" && item.variantes.length > 0 ? (
              <TallaSelector variantes={item.variantes} numero={whatsapp} item={item} urlProducto={urlProducto} />
            ) : (
              <a
                href={linkWhatsapp(whatsapp, item, urlProducto)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 font-display font-bold text-white transition hover:brightness-110"
              >
                Me interesa
              </a>
            )}
          </div>
        </div>

        {relacionados.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-white">
              También te puede interesar
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {relacionados.map((it) => (
                <ItemCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
