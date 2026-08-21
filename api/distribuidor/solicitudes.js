// api/distribuidor/solicitudes.js
// Flujo de pagos en 2 fases.
//   GET   ?slug=X [&estado=pendiente]     → lista solicitudes del distribuidor
//   POST  { slug, monto, tipo, notas? }   → crea solicitud (estado 'pendiente')
//   PATCH ?id=X { estado }                → 'aceptado' | 'rechazado'
//                                           al aceptar inserta el pago real en pagos_distribuidor

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  const getDistId = async (slug) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}`, { headers });
    const d = await r.json();
    if (!d?.length) return null;
    return d[0].id;
  };

  try {
    // GET: lista de solicitudes
    if (req.method === 'GET') {
      const { slug, estado } = req.query;
      if (!slug) return res.status(400).json({ error: "Falta 'slug'" });

      const distId = await getDistId(slug);
      if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });

      let url = `${SUPABASE_URL}/rest/v1/solicitudes_pago?distribuidor_id=eq.${distId}`;
      if (estado) url += `&estado=eq.${estado}`;
      url += `&order=created_at.desc`;

      const r = await fetch(url, { headers });
      return res.status(r.status).json(await r.json());
    }

    // POST: el distribuidor solicita un pago
    if (req.method === 'POST') {
      const { slug, monto, tipo, notas, es_abono } = req.body;
      if (!slug || !monto || !tipo) {
        return res.status(400).json({ error: "Faltan campos: slug, monto, tipo" });
      }
      if (!['parcial', 'completo'].includes(tipo)) {
        return res.status(400).json({ error: "tipo debe ser 'parcial' o 'completo'" });
      }

      const distId = await getDistId(slug);
      if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/solicitudes_pago`,
        {
          method: 'POST',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify({
            distribuidor_id: distId,
            monto: parseFloat(monto),
            tipo,
            estado: 'pendiente',
            notas: notas || null,
            es_abono: !!es_abono,
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

    // PATCH: aceptar / rechazar una solicitud
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { estado, monto_deuda } = req.body;
      if (!id) return res.status(400).json({ error: "Falta parámetro 'id'" });
      if (!['aceptado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: "estado debe ser 'aceptado' o 'rechazado'" });
      }

      // Traer la solicitud
      const solRes = await fetch(
        `${SUPABASE_URL}/rest/v1/solicitudes_pago?id=eq.${id}`,
        { headers }
      );
      const solData = await solRes.json();
      if (!solData?.length) return res.status(404).json({ error: "Solicitud no encontrada" });
      const sol = solData[0];

      if (sol.estado !== 'pendiente') {
        return res.status(409).json({ error: `La solicitud ya fue ${sol.estado}` });
      }

      let pago_id = null;

      // Al aceptar, crear el pago real
      if (estado === 'aceptado') {
        const pagoRes = await fetch(
          `${SUPABASE_URL}/rest/v1/pagos_distribuidor`,
          {
            method: 'POST',
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify({
              distribuidor_id: sol.distribuidor_id,
              monto: sol.monto,
              tipo: sol.tipo,
              notas: sol.notas,
              monto_deuda: (monto_deuda != null && monto_deuda !== "") ? parseFloat(monto_deuda) : 0,
            }),
          }
        );
        const pagoData = await pagoRes.json();
        if (!pagoRes.ok) {
          const msg = pagoData.message || pagoData.error || JSON.stringify(pagoData);
          return res.status(pagoRes.status).json({ error: msg });
        }
        pago_id = Array.isArray(pagoData) ? pagoData[0]?.id : pagoData?.id;
      }

      // Marcar la solicitud como resuelta
      const updRes = await fetch(
        `${SUPABASE_URL}/rest/v1/solicitudes_pago?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify({
            estado,
            pago_id,
            resolved_at: new Date().toISOString(),
          }),
        }
      );
      const updData = await updRes.json();
      if (!updRes.ok) {
        const msg = updData.message || updData.error || JSON.stringify(updData);
        return res.status(updRes.status).json({ error: msg });
      }
      return res.status(200).json(Array.isArray(updData) ? updData[0] : updData);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
