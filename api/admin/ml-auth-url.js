// api/admin/ml-auth-url.js
// Devuelve la URL de OAuth de ML con el client_id embebido
// Así el frontend nunca necesita saber el ML_CLIENT_ID

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
  const REDIRECT_URI = process.env.REDIRECT_URI || "https://uzustore.vercel.app";

  if (!ML_CLIENT_ID) {
    return res.status(500).json({ error: "ML_CLIENT_ID no configurado en variables de entorno de Vercel." });
  }

  const authUrl = `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return res.status(200).json({ url: authUrl });
}
