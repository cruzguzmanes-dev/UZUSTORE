// api/distribuidor/historial.js — dominio "ventas"
// GET  ?item_id=X            → historial de ventas de un ítem inventariado
// GET  ?distribuidor=X       → historial de ventas inventariadas del distribuidor
// GET  ?sueltas=X [&estado]  → ventas sueltas (piezas no inventariadas)
// POST { slug, nombre, cantidad? }        → el NORMAL registra una venta suelta ('pendiente')
// PATCH ?id=X { estado, precio_mayoreo? } → el PRO confirma (con mayoreo) o rechaza
// DELETE ?id=X&tipo=inventario|suelta     → el PRO borra una venta (error de captura);
//   si es 'inventario' también revierte inventario_distribuidor (vendidas--, cantidad++)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}&select=id`, { headers });
    const d = await r.json();
    return d?.length ? d[0].id : null;
  };

  try {
    // ─── GET ───
    if (req.method === 'GET') {
      const { item_id, distribuidor, sueltas, estado } = req.query;

      // Ventas sueltas del distribuidor
      if (sueltas) {
        const distId = await getDistId(sueltas);
        if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });
        let url = `${SUPABASE_URL}/rest/v1/ventas_sueltas?distribuidor_id=eq.${distId}`;
        if (estado) url += `&estado=eq.${estado}`;
        url += `&order=created_at.desc`;
        const r = await fetch(url, { headers });
        return res.status(r.status).json(await r.json());
      }

      // Historial completo del distribuidor (inventario)
      if (distribuidor) {
        const distId = await getDistId(distribuidor);
        if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/ventas_distribuidor?distribuidor_id=eq.${distId}&order=created_at.desc`,
          { headers }
        );
        return res.status(r.status).json(await r.json());
      }

      if (!item_id) {
        return res.status(400).json({ error: "Falta parámetro 'item_id', 'distribuidor' o 'sueltas'" });
      }

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ventas_distribuidor?item_id=eq.${item_id}&order=created_at.desc`,
        { headers }
      );
      return res.status(r.status).json(await r.json());
    }

    // ─── POST: el NORMAL registra una venta suelta ───
    if (req.method === 'POST') {
      const { slug, nombre, cantidad } = req.body;
      if (!slug || !nombre || !nombre.trim()) {
        return res.status(400).json({ error: "Faltan campos: slug, nombre" });
      }
      const distId = await getDistId(slug);
      if (!distId) return res.status(404).json({ error: "Distribuidor no encontrado" });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ventas_sueltas`,
        {
          method: 'POST',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify({
            distribuidor_id: distId,
            nombre: nombre.trim(),
            cantidad: parseInt(cantidad) || 1,
            estado: 'pendiente',
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

    // ─── PATCH: el PRO confirma (con mayoreo) o rechaza ───
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { estado, precio_mayoreo } = req.body;
      if (!id) return res.status(400).json({ error: "Falta parámetro 'id'" });
      if (!['confirmada', 'rechazada'].includes(estado)) {
        return res.status(400).json({ error: "estado debe ser 'confirmada' o 'rechazada'" });
      }
      if (estado === 'confirmada' && (precio_mayoreo == null || precio_mayoreo === "" || parseFloat(precio_mayoreo) <= 0)) {
        return res.status(400).json({ error: "Para confirmar hay que poner el precio de mayoreo" });
      }

      const body = {
        estado,
        confirmed_at: new Date().toISOString(),
        ...(estado === 'confirmada' && { precio_mayoreo: parseFloat(precio_mayoreo) }),
      };

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ventas_sueltas?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify(body),
        }
      );
      const data = await r.json();
      if (!r.ok) {
        const msg = data.message || data.error || JSON.stringify(data);
        return res.status(r.status).json({ error: msg });
      }
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    // ─── DELETE: el PRO borra una venta (error de captura) ───
    if (req.method === 'DELETE') {
      const { id, tipo } = req.query;
      if (!id) return res.status(400).json({ error: "Falta parámetro 'id'" });
      if (!['inventario', 'suelta'].includes(tipo)) {
        return res.status(400).json({ error: "Falta parámetro 'tipo' ('inventario' o 'suelta')" });
      }

      if (tipo === 'suelta') {
        // Sin artículo que revertir -- el saldo se recalcula solo con las confirmadas restantes
        const delRes = await fetch(`${SUPABASE_URL}/rest/v1/ventas_sueltas?id=eq.${id}`, {
          method: 'DELETE', headers,
        });
        if (!delRes.ok) {
          const d = await delRes.json().catch(() => ({}));
          return res.status(delRes.status).json({ error: d.message || d.error || "Error eliminando" });
        }
        return res.status(200).json({ ok: true });
      }

      // tipo === 'inventario' -- hay que revertir el artículo antes de borrar la venta,
      // si no el stock y el saldo pendiente quedan mal (vendidas/cantidad son contadores).
      const ventaRes = await fetch(`${SUPABASE_URL}/rest/v1/ventas_distribuidor?id=eq.${id}&select=item_id,cantidad`, { headers });
      const venta = (await ventaRes.json())?.[0];
      if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

      const itemRes = await fetch(`${SUPABASE_URL}/rest/v1/inventario_distribuidor?id=eq.${venta.item_id}&select=cantidad,vendidas`, { headers });
      const item = (await itemRes.json())?.[0];
      if (item) {
        await fetch(`${SUPABASE_URL}/rest/v1/inventario_distribuidor?id=eq.${venta.item_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            cantidad: (item.cantidad || 0) + venta.cantidad,
            vendidas: Math.max(0, (item.vendidas || 0) - venta.cantidad),
          }),
        });
      }

      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/ventas_distribuidor?id=eq.${id}`, {
        method: 'DELETE', headers,
      });
      if (!delRes.ok) {
        const d = await delRes.json().catch(() => ({}));
        return res.status(delRes.status).json({ error: d.message || d.error || "Error eliminando" });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
