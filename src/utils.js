import { SUPABASE_URL, SUPABASE_KEY } from "./constants";

export const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export const sb = async (path, method = "GET", body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Error Supabase"); }
  return res.status === 204 ? null : res.json();
};

export const calcFIFO = (paidOrders, lotes) => {
  const lotesCopy = lotes.map(l => ({ ...l, _disp: l.cantidad_disponible }));
  return paidOrders.map(order => {
    // netoML: solo cuando tenemos el desglose real (saleFee > 0)
    const netoML = order.saleFee > 0 ? order.paidAmount : null;

    // Cada fila ya es un solo SKU (multi-item se expande en mapOrder)
    const lotesForSku = lotesCopy.filter(l => l.sku === order.sku && l._disp > 0);
    if (lotesForSku.length === 0) {
      return { ...order, costo: null, netoML, loteInfo: null };
    }
    const lote = lotesForSku[0];
    lote._disp -= 1;
    return {
      ...order,
      costo: lote.costo_unitario,
      netoML,
      loteInfo: `${lote.fecha_compra} · $${lote.costo_unitario}`,
    };
  });
};
