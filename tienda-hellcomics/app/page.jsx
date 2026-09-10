import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ItemCard from "@/components/ItemCard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 60; // ISR: refresca cada minuto, no en cada visita

async function getNovedades() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("items")
    .select("id,nombre,slug,precio,stock,estado,created_at,categorias(nombre,slug),imagenes(url,orden)")
    .neq("estado", "oculto") // "agotado" también se muestra -- solo "oculto" se esconde
    .eq("publico", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data || []).map((it) => ({ ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) }));
}

async function getCategorias() {
  const db = supabaseAdmin();
  const { data } = await db.from("categorias").select("id,nombre,slug").order("orden").order("nombre");
  return data || [];
}

// Secciones curadas a mano por el dueño desde /admin/secciones -- no es automático.
async function getSecciones() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("secciones")
    .select(
      "id, nombre, orden, seccion_items(orden, items(id,nombre,slug,precio,stock,estado,publico,categorias(nombre,slug),imagenes(url,orden)))"
    )
    .eq("activa", true)
    .order("orden");

  return (data || [])
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      items: (s.seccion_items || [])
        .sort((a, b) => a.orden - b.orden)
        .map((si) => si.items)
        .filter((it) => it && it.estado !== "oculto" && it.publico)
        .map((it) => ({ ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) }))
        .slice(0, 20),
    }))
    .filter((s) => s.items.length > 0);
}

export default async function HomePage() {
  const [novedades, categorias, secciones] = await Promise.all([
    getNovedades(),
    getCategorias(),
    getSecciones(),
  ]);

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {categorias.length > 0 && (
          <section className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <Link
                  key={c.id}
                  href={`/resultados?categoria=${c.slug}`}
                  className="rounded-full bg-gradient-to-r from-brand-flame-start to-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-black/30 transition hover:scale-105 hover:shadow-lg hover:shadow-brand/30 active:scale-95"
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          </section>
        )}

        {secciones.map((s) => (
          <section key={s.id} className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-white">{s.nombre}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {s.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-lg font-extrabold uppercase tracking-wide text-white">Novedades</h1>
            <Link href="/resultados" className="text-sm text-white/50 hover:text-brand">
              Ver todo →
            </Link>
          </div>

          {novedades.length === 0 ? (
            <p className="py-16 text-center text-white/50">Todavía no hay productos cargados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {novedades.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
