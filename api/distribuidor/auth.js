// api/distribuidor/auth.js
// GET: validar acceso por slug y código
// Roles:
//   "admin" → acceso_admin code  → ve todo (corte, ganancias, saldos)
//   "basic" → acceso_code        → solo inventario y marcar vendidos

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kzngmlofewyoteedxxca.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_5lSuMZ7BaYqVYFZOABn6zg_c0V3LdDx';

  try {
    const { slug, code } = req.query;

    if (!slug) {
      return res.status(400).json({ error: "Falta parámetro 'slug'" });
    }

    // Buscar distribuidor por slug
    const distRes = await fetch(
      `${SUPABASE_URL}/rest/v1/distribuidores?slug=eq.${slug}`,
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await distRes.json();
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Distribuidor no encontrado" });
    }

    const distribuidor = data[0];

    const base = {
      distribuidor_id: distribuidor.id,
      nombre:          distribuidor.nombre,
      slug:            distribuidor.slug,
      modo_precio:     distribuidor.modo_precio || "venta",
    };

    // Si no se proporciona código, solo retornar info básica (usado internamente)
    if (!code) {
      return res.status(200).json({ ...base, role: null });
    }

    const trimmedCode = code.trim();

    // 1. Verificar código admin (acceso completo: corte, ganancias, saldos)
    if (distribuidor.acceso_admin && distribuidor.acceso_admin === trimmedCode) {
      return res.status(200).json({ ...base, role: "admin" });
    }

    // 2. Verificar código básico (solo inventario y marcar vendidos)
    if (distribuidor.acceso_code && distribuidor.acceso_code === trimmedCode) {
      return res.status(200).json({ ...base, role: "basic" });
    }

    // Ninguno coincide
    return res.status(403).json({ error: "Código de acceso inválido" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
