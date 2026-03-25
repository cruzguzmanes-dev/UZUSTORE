// api/distribuidor/upload.js
// POST: subir foto a Supabase Storage y retornar URL pública

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sexbthodwpembszdeqqc.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_M-n1Y5Le0kQtU8csNj7z3Q_KgBssEql';

  try {
    // req.body debería ser Buffer con datos binarios
    // req.query debería tener { distribuidor, filename }
    const { distribuidor, filename } = req.query;

    if (!distribuidor || !filename) {
      return res.status(400).json({ error: "Faltan parámetros 'distribuidor' y 'filename'" });
    }

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    // Ruta: /distribuidor/{slug}/{timestamp}-{filename}
    const timestamp = Date.now();
    const filePath = `distribuidor/${distribuidor}/${timestamp}-${filename}`;

    // Subir a Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/distribuidor-fotos/${filePath}`,
      {
        method: 'POST',
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
        body: req.body,
      }
    );

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      return res.status(uploadRes.status).json({ error: `Upload failed: ${error}` });
    }

    // Generar URL pública
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/distribuidor-fotos/${filePath}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      path: filePath,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
