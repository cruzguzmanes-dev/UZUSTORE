// api/distribuidor/settings.js
// GET  ?slug=X          → obtener configuración del distribuidor
// PATCH { slug, modo_precio } → actualizar configuración

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // GET: leer configuración de un distribuidor
    if (req.method === 'GET') {
      const { slug } = req.query;
      if (!slug) return res.status(400).json({ error: "Falta 'slug'" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}&select=slug,modo_precio`,
        { headers }
      );
      const data = await r.json();
      if (!data?.length) return res.status(404).json({ error: "Distribuidor no encontrado" });
      return res.status(200).json(data[0]);
    }

    // PATCH: actualizar configuración
    if (req.method === 'PATCH') {
      const { slug, modo_precio } = req.body;

      if (!slug) return res.status(400).json({ error: "Falta 'slug'" });
      if (modo_precio !== undefined && !['venta', 'mayoreo'].includes(modo_precio)) {
        return res.status(400).json({ error: "modo_precio debe ser 'venta' o 'mayoreo'" });
      }

      const updateData = {};
      if (modo_precio !== undefined) updateData.modo_precio = modo_precio;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nada que actualizar' });
      }

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}`,
        {
          method: 'PATCH',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify(updateData),
        }
      );
      const data = await r.json();
      if (!r.ok) {
        const msg = data.message || data.error || JSON.stringify(data);
        return res.status(r.status).json({ error: msg });
      }
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
