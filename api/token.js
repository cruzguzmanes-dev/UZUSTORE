// api/token.js - Vercel Serverless Function
// This runs on the SERVER so it bypasses CORS restrictions

export default async function handler(req, res) {
  // Allow requests from any origin (your frontend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client_id, client_secret, code, redirect_uri } = req.body;

  if (!client_id || !client_secret || !code) {
    return res.status(400).json({ error: 'Faltan parámetros: client_id, client_secret, code' });
  }

  try {
    const mlRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        code,
        redirect_uri: redirect_uri || 'https://uzustore.vercel.app',
      }),
    });

    const data = await mlRes.json();

    if (!mlRes.ok) {
      return res.status(mlRes.status).json({ error: data.message || 'Error de MercadoLibre', details: data });
    }

    // Guardar refresh_token en Supabase para login automático futuro
    if (data.refresh_token) {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_KEY;
      if (SUPABASE_URL && SUPABASE_KEY) {
        // Borrar tokens anteriores e insertar el nuevo
        await fetch(`${SUPABASE_URL}/rest/v1/admin_ml_tokens`, {
          method: 'DELETE',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }).catch(() => {});
        await fetch(`${SUPABASE_URL}/rest/v1/admin_ml_tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            refresh_token: data.refresh_token,
            ml_user_id: String(data.user_id || ''),
          }),
        }).catch(() => {});
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
