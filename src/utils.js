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
    const netoML = order.saleFee > 0 ? order.paidAmount : null;
    const qty = order.qty || 1;

    const lotesForSku = lotesCopy.filter(l => l.sku === order.sku && l._disp > 0);
    if (lotesForSku.length === 0) {
      return { ...order, costo: null, netoML, loteInfo: null };
    }

    // FIFO: consumir qty unidades (puede cruzar varios lotes)
    let restantes = qty;
    let costoTotal = 0;
    let loteInfo = null;
    for (const lote of lotesForSku) {
      if (restantes <= 0) break;
      const consume = Math.min(restantes, lote._disp);
      costoTotal += lote.costo_unitario * consume;
      lote._disp -= consume;
      restantes -= consume;
      if (!loteInfo) loteInfo = `${lote.fecha_compra} · $${lote.costo_unitario}`;
    }

    if (restantes > 0) {
      // Stock insuficiente para cubrir todas las unidades
      return { ...order, costo: null, netoML, loteInfo: null };
    }

    return { ...order, costo: costoTotal, netoML, loteInfo };
  });
};
