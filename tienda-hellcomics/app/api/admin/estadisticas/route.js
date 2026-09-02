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

// Fecha (YYYY-MM-DD) y hora (0-23) en hora de México, sin importar el timezone del
// servidor (Vercel corre en UTC) -- si no se hace así, "horas más concurrentes" sale
// corrido varias horas.
function fechaMx(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso)); // en-CA da formato YYYY-MM-DD directo
}
function horaMx(iso) {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(iso)),
    10
  ) % 24; // "24" a medianoche en algunos runtimes -- normalizar a 0
}

export async function GET() {
  const guard = requireAdmin();
  if (guard) return guard;

  const db = supabaseAdmin();

  const contar = async (desde) => {
    let q = db.from("visitas").select("id", { count: "exact", head: true });
    if (desde) q = q.gte("created_at", desde);
    const { count } = await q;
    return count || 0;
  };

  const [total, hoy, semana, mes] = await Promise.all([
    contar(null),
    contar(inicioDe(0)),
    contar(inicioDe(6)),
    contar(inicioDe(29)),
  ]);

  // Traer crudo (path + fecha) de los últimos 30 días -- de aquí se sacan el resto de
  // los desgloses (por día, por hora, items por día) sin más viajes a la base.
  const { data: crudos } = await db.from("visitas").select("path, created_at").gte("created_at", inicioDe(29));
  const filas = crudos || [];

  // Visitas por día (últimos 14, para la gráfica).
  const porDia = {};
  for (const v of filas) {
    const dia = fechaMx(v.created_at);
    porDia[dia] = (porDia[dia] || 0) + 1;
  }
  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = fechaMx(d.toISOString());
    dias.push({ dia: key, visitas: porDia[key] || 0 });
  }

  // Horas más concurrentes (0-23), en hora de México, sobre los últimos 30 días.
  const porHora = Array.from({ length: 24 }, () => 0);
  for (const v of filas) porHora[horaMx(v.created_at)]++;
  const horas = porHora.map((visitas, hora) => ({ hora, visitas }));

  // Items vistos por día (últimos 30 días) -- solo paths de producto.
  const porDiaItem = {}; // { "2026-09-05": { "/producto/x": 3, ... } }
  for (const v of filas) {
    if (!v.path.startsWith("/producto/")) continue;
    const dia = fechaMx(v.created_at);
    porDiaItem[dia] ||= {};
    porDiaItem[dia][v.path] = (porDiaItem[dia][v.path] || 0) + 1;
  }
  const slugs = [...new Set(Object.values(porDiaItem).flatMap((m) => Object.keys(m)))].map((p) =>
    p.replace("/producto/", "")
  );
  const { data: itemsInfo } = slugs.length
    ? await db.from("items").select("slug, nombre").in("slug", slugs)
    : { data: [] };
  const nombrePorSlug = Object.fromEntries((itemsInfo || []).map((i) => [i.slug, i.nombre]));

  const itemsPorDia = Object.fromEntries(
    Object.entries(porDiaItem)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dia, mapa]) => [
        dia,
        Object.entries(mapa)
          .map(([path, visitas]) => {
            const slug = path.replace("/producto/", "");
            return { path, nombre: nombrePorSlug[slug] || slug, visitas };
          })
          .sort((a, b) => b.visitas - a.visitas),
      ])
  );

  // Páginas más vistas en general (30 días).
  const porPath = {};
  for (const v of filas) porPath[v.path] = (porPath[v.path] || 0) + 1;
  const topPaths = Object.entries(porPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, visitas]) => ({ path, visitas }));

  return NextResponse.json({ total, hoy, semana, mes, dias, horas, itemsPorDia, topPaths });
}
