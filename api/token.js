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
        redirect_uri: redirect_uri || 'https://uzustore2-dashboard.vercel.app',
      }),
    });

    const data = await mlRes.json();

    if (!mlRes.ok) {
      return res.status(mlRes.status).json({ error: data.message || 'Error de MercadoLibre', details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
