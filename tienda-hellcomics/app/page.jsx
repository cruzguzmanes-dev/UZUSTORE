import Link from "next/link";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 60; // ISR: refresca cada minuto, no en cada visita

async function getNovedades() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("items")
    .select("id,nombre,slug,precio,stock,estado,created_at,categorias(nombre,slug),imagenes(url,orden)")
    .eq("estado", "activo")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data || []).map((it) => ({ ...it, imagenes: (it.imagenes || []).sort((a, b) => a.orden - b.orden) }));
}

async function getCategorias() {
  const db = supabaseAdmin();
  const { data } = await db.from("categorias").select("id,nombre,slug").order("orden").order("nombre");
  return data || [];
}

export default async function HomePage() {
  const [novedades, categorias] = await Promise.all([getNovedades(), getCategorias()]);

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
                  className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 transition hover:border-brand hover:text-white"
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          </section>
        )}

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
    </div>
  );
}
