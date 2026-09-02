import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminGuard";

function inicioDe(diasAtras) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString();
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

  const [total, hoy, ultimos7, ultimos30] = await Promise.all([
    contar(null),
    contar(inicioDe(0)),
    contar(inicioDe(6)),
    contar(inicioDe(29)),
  ]);

  // Últimos 14 días, uno por uno, para la lista de "visitas por día".
  const { data: recientes } = await db
    .from("visitas")
    .select("created_at")
    .gte("created_at", inicioDe(13));

  const porDia = {};
  for (const v of recientes || []) {
    const dia = v.created_at.slice(0, 10);
    porDia[dia] = (porDia[dia] || 0) + 1;
  }
  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dias.push({ dia: key, visitas: porDia[key] || 0 });
  }

  // Páginas más vistas en los últimos 30 días.
  const { data: top } = await db.from("visitas").select("path").gte("created_at", inicioDe(29));
  const porPath = {};
  for (const v of top || []) porPath[v.path] = (porPath[v.path] || 0) + 1;
  const topPaths = Object.entries(porPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, visitas]) => ({ path, visitas }));

  return NextResponse.json({ total, hoy, ultimos7, ultimos30, dias, topPaths });
}
