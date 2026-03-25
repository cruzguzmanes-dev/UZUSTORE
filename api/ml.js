// api/ml.js - Proxy para todas las llamadas a la API de MercadoLibre
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, format_new } = req.query;
  if (!path) return res.status(400).json({ error: 'Falta el parámetro path' });

  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Falta Authorization header' });

  try {
    const url = `https://api.mercadolibre.com/${Array.isArray(path) ? path.join('/') : path}`;

    const headers = { Authorization: token };
    // Pasar x-format-new cuando se solicita (necesario para obtener sale_fee, taxes, shipping)
    if (format_new === 'true') headers['x-format-new'] = 'true';

    const mlRes = await fetch(url, { headers });
    const data = await mlRes.json();
    return res.status(mlRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error proxy: ' + err.message });
  }
}
