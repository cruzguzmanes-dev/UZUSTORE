// api/distribuidor/auth.js
// GET: validar acceso simple por slug y código (opcional)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sexbthodwpembszdeqqc.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_M-n1Y5Le0kQtU8csNj7z3Q_KgBssEql';

  try {
    const { slug, code } = req.query;

    if (!slug) {
      return res.status(400).json({ error: "Falta parámetro 'slug'" });
    }

    // Buscar distribuidor por slug
    const distRes = await fetch(
      `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}`,
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await distRes.json();
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Distribuidor no encontrado" });
    }

    const distribuidor = data[0];

    // Validar código si se proporciona
    if (code && distribuidor.acceso_code && distribuidor.acceso_code !== code) {
      return res.status(403).json({ error: "Código de acceso inválido" });
    }

    return res.status(200).json({
      distribuidor_id: distribuidor.id,
      nombre: distribuidor.nombre,
      slug: distribuidor.slug,
      acceso_code: distribuidor.acceso_code ? true : false, // no retornar el código
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
