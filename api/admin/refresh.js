// api/admin/refresh.js
// Usa el refresh_token guardado en Supabase para obtener un nuevo access_token de ML
// También guarda el nuevo refresh_token (ML rota los tokens)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
  const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    return res.status(500).json({ error: "ML no configurado. Agrega ML_CLIENT_ID y ML_CLIENT_SECRET en Vercel." });
  }

  try {
    // 1. Obtener refresh_token de Supabase
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_ml_tokens?order=id.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const tokens = await sbRes.json();

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: "no_refresh_token", message: "No hay refresh token guardado. Necesitas conectar MercadoLibre una vez." });
    }

    const savedRefreshToken = tokens[0].refresh_token;

    // 2. Usar refresh_token para obtener nuevo access_token
    const mlRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        refresh_token: savedRefreshToken,
      }),
    });

    const mlData = await mlRes.json();

    if (!mlRes.ok || !mlData.access_token) {
      // Si el refresh_token expiró, el usuario debe reconectar ML una vez
      if (mlData.error === "invalid_grant") {
        return res.status(401).json({ error: "refresh_expired", message: "Tu sesión de MercadoLibre expiró. Necesitas reconectar ML una vez." });
      }
      return res.status(mlRes.status).json({ error: mlData.message || "Error al refrescar token" });
    }

    // 3. Guardar el nuevo refresh_token en Supabase (ML lo rota cada vez)
    if (mlData.refresh_token) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/admin_ml_tokens?id=eq.${tokens[0].id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            refresh_token: mlData.refresh_token,
            ml_user_id: String(mlData.user_id || tokens[0].ml_user_id),
            updated_at: new Date().toISOString(),
          }),
        }
      );
    }

    // Retornar access_token y su expiración
    return res.status(200).json({
      access_token: mlData.access_token,
      expires_in: mlData.expires_in || 21600, // 6 horas por defecto
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
