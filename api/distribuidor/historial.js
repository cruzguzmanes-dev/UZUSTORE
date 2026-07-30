// api/distribuidor/historial.js
// GET ?item_id=X       → historial de ventas de un ítem específico
// GET ?distribuidor=X  → historial de ventas de todo el distribuidor (por slug)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  try {
    const { item_id, distribuidor } = req.query;

    // Historial completo del distribuidor (por slug)
    if (distribuidor) {
      const distRes = await fetch(
        `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${distribuidor}&select=id`,
        { headers }
      );
      const distData = await distRes.json();
      if (!distData?.length) return res.status(404).json({ error: "Distribuidor no encontrado" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ventas_distribuidor?distribuidor_id=eq.${distData[0].id}&order=created_at.desc`,
        { headers }
      );
      return res.status(r.status).json(await r.json());
    }

    if (!item_id) {
      return res.status(400).json({ error: "Falta parámetro 'item_id' o 'distribuidor'" });
    }

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ventas_distribuidor?item_id=eq.${item_id}&order=created_at.desc`,
      { headers }
    );

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
