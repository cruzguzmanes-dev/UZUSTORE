// api/distribuidor/inventario.js
// GET: obtener inventario de un distribuidor
// POST: crear nuevo artículo
// PUT: actualizar artículo (marcar vendido)
// DELETE: eliminar artículo

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  try {
    // GET /api/distribuidor/inventario?distribuidor=gaticueva
    if (req.method === 'GET') {
      const { distribuidor, id } = req.query;

      if (id) {
        // GET un artículo específico
        const res_api = await fetch(
          `${SUPABASE_URL}/rest/v1/inventario_distribuidor?id=eq.${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
            },
          }
        );
        const data = await res_api.json();
        return res.status(res_api.status).json(data);
      }

      if (!distribuidor) {
        return res.status(400).json({ error: "Falta parámetro 'distribuidor'" });
      }

      // Obtener ID del distribuidor por slug
      const slugRes = await fetch(
        `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${distribuidor}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const slugData = await slugRes.json();
      if (!slugData || slugData.length === 0) {
        return res.status(404).json({ error: "Distribuidor no encontrado" });
      }
      const distribuidor_id = slugData[0].id;

      // Obtener inventario del distribuidor
      const invRes = await fetch(
        `${SUPABASE_URL}/rest/v1/inventario_distribuidor?distribuidor_id=eq.${distribuidor_id}&order=created_at.desc`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const inventario = await invRes.json();
      return res.status(invRes.status).json(inventario);
    }

    // POST /api/distribuidor/inventario
    if (req.method === 'POST') {
      const { distribuidor, nombre, foto_url, precio_venta, cantidad } = req.body;

      if (!distribuidor || !precio_venta) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      // Obtener ID del distribuidor
      const slugRes = await fetch(
        `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${distribuidor}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const slugData = await slugRes.json();
      if (!slugData || slugData.length === 0) {
        return res.status(404).json({ error: "Distribuidor no encontrado" });
      }
      const distribuidor_id = slugData[0].id;

      // Crear artículo
      const createRes = await fetch(
        `${SUPABASE_URL}/rest/v1/inventario_distribuidor`,
        {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            distribuidor_id,
            nombre,
            foto_url,
            precio_venta: parseFloat(precio_venta),
            cantidad: parseInt(cantidad) || 1,
          }),
        }
      );
      const created = await createRes.json();
      return res.status(createRes.status).json(created);
    }

    // PUT /api/distribuidor/inventario/:id
    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Falta parámetro 'id'" });

      const { cantidad, vendidas, precio_mayoreo } = req.body;

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/inventario_distribuidor?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            ...(cantidad !== undefined && { cantidad: parseInt(cantidad) }),
            ...(vendidas !== undefined && { vendidas: parseInt(vendidas) }),
            ...(precio_mayoreo !== undefined && { precio_mayoreo: parseFloat(precio_mayoreo) }),
          }),
        }
      );
      const updated = await updateRes.json();
      return res.status(updateRes.status).json(updated);
    }

    // DELETE /api/distribuidor/inventario/:id
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Falta parámetro 'id'" });

      const delRes = await fetch(
        `${SUPABASE_URL}/rest/v1/inventario_distribuidor?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      return res.status(delRes.status).json(delRes.status === 204 ? { ok: true } : await delRes.json());
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
