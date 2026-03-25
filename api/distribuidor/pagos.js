// api/distribuidor/pagos.js
// GET  ?slug=gaticueva  → historial de pagos del distribuidor
// POST { slug, monto, tipo: 'parcial'|'completo', notas? } → registrar pago

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  // Helper: slug → distribuidor_id
  const getDistId = async (slug) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}`, { headers });
    const d = await r.json();
    if (!d?.length) return null;
    return d[0].id;
  };

  try {
    // GET: historial de pagos
    if (req.method === 'GET') {
      const { slug } = req.query;
      if (!slug) return res.status(400).json({ error: "Falta 'slug'" });

      const distId = await getDistId(slug);
      if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/pagos_distribuidor?distribuidor_id=eq.${distId}&order=created_at.desc`,
        { headers }
      );
      return res.status(r.status).json(await r.json());
    }

    // POST: registrar un pago
    if (req.method === 'POST') {
      const { slug, monto, tipo, notas } = req.body;

      if (!slug || !monto || !tipo) {
        return res.status(400).json({ error: "Faltan campos requeridos: slug, monto, tipo" });
      }
      if (!['parcial', 'completo'].includes(tipo)) {
        return res.status(400).json({ error: "tipo debe ser 'parcial' o 'completo'" });
      }

      const distId = await getDistId(slug);
      if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/pagos_distribuidor`,
        {
          method: 'POST',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify({
            distribuidor_id: distId,
            monto: parseFloat(monto),
            tipo,
            notas: notas || null,
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) {
        const msg = data.message || data.error || JSON.stringify(data);
        return res.status(r.status).json({ error: msg });
      }
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
