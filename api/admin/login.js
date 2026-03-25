// api/admin/login.js
// Verifica usuario/contraseña del admin
// Las credenciales viven en variables de entorno de Vercel (nunca en el frontend)

import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    return res.status(500).json({ error: "Admin no configurado. Agrega ADMIN_USERNAME y ADMIN_PASSWORD_HASH en las variables de entorno de Vercel." });
  }

  // Verificar usuario
  if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // Verificar contraseña (hash SHA-256)
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash !== ADMIN_PASSWORD_HASH) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // Verificar si ML está configurado
  const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
  const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
  const mlConfigured = !!(ML_CLIENT_ID && ML_CLIENT_SECRET);

  return res.status(200).json({
    ok: true,
    ml_configured: mlConfigured,
    // Si ML está configurado, intentar obtener un nuevo access_token con el refresh_token
  });
}
