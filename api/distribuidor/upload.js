// api/distribuidor/upload.js
// POST: subir foto a Supabase Storage y retornar URL pública

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function getContentType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  return map[ext] || "application/octet-stream";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://kzngmlofewyoteedxxca.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx";

  try {
    const { distribuidor, filename } = req.query;
    if (!distribuidor || !filename) {
      return res.status(400).json({ error: "Faltan parámetros 'distribuidor' y 'filename'" });
    }

    const body = await getRawBody(req);
    if (!body || body.length === 0) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `distribuidor/${distribuidor}/${timestamp}-${safeName}`;
    const contentType = getContentType(filename);

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/distribuidor-fotos/${filePath}`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": contentType,
          "Content-Length": String(body.length),
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return res.status(uploadRes.status).json({ error: `Upload failed: ${errorText}` });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/distribuidor-fotos/${filePath}`;
    return res.status(200).json({ success: true, url: publicUrl, path: filePath });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
