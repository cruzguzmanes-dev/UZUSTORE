import React, { useState, useCallback } from "react";
import { TAX, MOCK_ORDERS, GS } from "./constants";
import { sb, calcFIFO } from "./utils";
import AdminLogin from "./components/AdminLogin";
import ModalLote from "./components/ModalLote";
import Resumen from "./tabs/Resumen";
import Mensual from "./tabs/Mensual";
import Inventario from "./tabs/Inventario";
import Impuestos from "./tabs/Impuestos";
import Ordenes from "./tabs/Ordenes";
import Distribuidores from "./tabs/Distribuidores";
import InventarioCarrilB from "./tabs/InventarioCarrilB";
import DistribuidorDashboard from "./pages/distribuidor/DistribuidorDashboard";

const TABS = ["resumen", "mensual", "inventario", "compras", "impuestos", "ordenes", "distribuidores"];

// ML caps offset at 50 per query — paginate by date range instead
async function fetchAllOrders(sellerId, accessToken) {
  let all = [];
  const ranges = [];
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    ranges.push({
      from: from.toISOString().slice(0, 19) + ".000Z",
      to:   to.toISOString().slice(0, 19) + ".000Z",
    });
  }
  for (const range of ranges) {
    let offset = 0;
    while (true) {
      const path = `orders/search?seller=${sellerId}&order.status=paid&sort=date_desc&limit=50&offset=${offset}&order.date_created.from=${range.from}&order.date_created.to=${range.to}`;
      const res = await fetch(`/api/ml?path=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (data.error) { console.warn("ML error for range", range.from, data.error, data.message); break; }
      const results = data.results || [];
      all = [...all, ...results];
      if (results.length < 50) break;
      offset += 50;
      if (offset >= 200) break;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  const seen = new Set();
  return all.filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; });
}

// Calcula retenciones ML según fórmula oficial México:
// Base gravable = precio / 1.16, IVA retenido = base × 8%, ISR = base × 2.5%
function calcTaxes(totalAmount) {
  const base = totalAmount / 1.16;
  const retencionIVA = base * 0.08;
  const retencionISR = base * 0.025;
  return { retencionIVA, retencionISR, total: retencionIVA + retencionISR };
}

// Enriquece con sale_fee real + list_cost envío real + retenciones calculadas
async function enrichOrdersWithFees(orders, accessToken) {
  const BATCH = 10;
  const enriched = [...orders];
  for (let i = 0; i < enriched.length; i += BATCH) {
    const batch = enriched.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (o, idx) => {
        try {
          const r1 = await fetch(`/api/ml?path=${encodeURIComponent("orders/" + o.id)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const detail = await r1.json();
          if (!detail || detail.error) return;
          const totalAmount = detail.total_amount || 0;
          // sale_fee × qty por cada item (ML reporta la comisión por unidad)
          const saleFee = (detail.order_items || []).reduce((s, it) => s + (it.sale_fee || 0) * (it.quantity || 1), 0);
          const shippingId = detail.shipping?.id;
          let shippingCost = 0;
          if (shippingId) {
            const r2 = await fetch(`/api/ml?path=${encodeURIComponent("shipments/" + shippingId)}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const shipment = await r2.json();
            const listCost = shipment?.shipping_option?.list_cost || 0;
            // Si es un pack, el envío se divide entre el número de items del shipment
            const itemsEnPaquete = shipment?.shipping_items?.length || 1;
            shippingCost = listCost / itemsEnPaquete;
          }
          // Impuestos calculados sobre el precio de esta orden (no del pack completo)
          const taxes = calcTaxes(totalAmount);
          const paidAmount = totalAmount - saleFee - shippingCost - taxes.total;
          enriched[i + idx] = {
            ...enriched[i + idx],
            saleFee, shippingCost,
            retencionIVA: taxes.retencionIVA,
            retencionISR: taxes.retencionISR,
            taxAmount: taxes.total,
            paidAmount,
          };
        } catch (err) {
          console.error("Enrich error orden", o.id, err);
        }
      })
    );
  }
  return enriched;
}


export default function App() {
  // Detectar ruta de distribuidor
  const pathname = window.location.pathname;
  const distribuidorMatch = pathname.match(/^\/distribuidor\/([a-z]+)$/);
  if (distribuidorMatch) {
    const slug = distribuidorMatch[1];
    return <DistribuidorDashboard slug={slug} />;
  }

  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [activeTab, setActiveTab] = useState("resumen");
  const [useMock, setUseMock] = useState(false);
  const [connectedUser, setConnectedUser] = useState("");
  const [showModalLote, setShowModalLote] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [enrichedMonths, setEnrichedMonths] = useState(new Set());
  const [enrichingMonth, setEnrichingMonth] = useState(null);
  const tokenRef = React.useRef(null);

  const fetchLotes = useCallback(async () => {
    setLoadingLotes(true);
    try { const data = await sb("lotes?order=fecha_compra.asc,created_at.asc"); setLotes(data || []); }
    catch (e) { console.error(e); }
    finally { setLoadingLotes(false); }
  }, []);

  const fetchOrders = useCallback(async (accessToken) => {
    tokenRef.current = accessToken;
    try {
      setLoadingOrders(true);
      const meRes = await fetch("/api/ml?path=users/me", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!meRes.ok) throw new Error("Token inválido");
      const me = await meRes.json();
      setConnectedUser(me.nickname || me.email);
      setConnected(true); // show dashboard immediately

      const results = await fetchAllOrders(me.id, accessToken);
      // Map basic fields first so dashboard shows something immediately
      const mapOrder = (o) => {
        const totalAmount = o.total_amount || 0;
        const qty = o.order_items?.[0]?.quantity || 1;
        const saleFee = o.saleFee ?? ((o.order_items?.[0]?.sale_fee || 0) * qty);
        const shippingCost = o.shippingCost ?? 0;
        const retencionIVA = o.retencionIVA ?? 0;
        const retencionISR = o.retencionISR ?? 0;
        const paidAmount = o.paidAmount > 0 ? o.paidAmount : null;
        return [{
          id: String(o.id),
          orderId: String(o.id),
          date: o.date_created?.slice(0, 10),
          title: o.order_items?.[0]?.item?.title || "—",
          sku: o.order_items?.[0]?.item?.id || "—",
          qty,
          status: o.status,
          salePrice: totalAmount,
          saleFee,
          shippingCost,
          retencionIVA,
          retencionISR,
          taxAmount: retencionIVA + retencionISR,
          paidAmount,
          baseGravable: totalAmount * 0.8621,
        }];
      };
      setOrders(results.flatMap(mapOrder));
      await fetchLotes();

      // Enriquecer solo mes actual y mes anterior (los más usados)
      const now = new Date();
      const recentMonths = new Set([
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0") || "12"}`,
      ]);
      const recentOrders = results.filter(o => {
        const m = o.date_created?.slice(0, 7);
        return recentMonths.has(m);
      });
      if (recentOrders.length > 0) {
        const enriched = await enrichOrdersWithFees(recentOrders, accessToken);
        // Merge enriched fees back into raw results by id, then re-expand with mapOrder
        const enrichedMap = new Map(enriched.map(o => [String(o.id), o]));
        const merged = results.map(o => {
          const e = enrichedMap.get(String(o.id));
          if (!e) return o;
          return { ...o, saleFee: e.saleFee, shippingCost: e.shippingCost, retencionIVA: e.retencionIVA, retencionISR: e.retencionISR, taxAmount: e.taxAmount, paidAmount: e.paidAmount };
        });
        setOrders(merged.flatMap(mapOrder));
        setEnrichedMonths(recentMonths);
      }
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoadingOrders(false); }
  }, [fetchLotes]);

  // Enriquecer un mes específico bajo demanda
  const handleDebug = React.useCallback(async (orderId) => {
    if (!tokenRef.current) return;
    setDebugInfo("Consultando orden " + orderId + "...");
    const r1 = await fetch(`/api/ml?path=${encodeURIComponent("orders/" + orderId)}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` }
    });
    const order = await r1.json();
    const shippingId = order.shipping?.id;
    let shipment = null;
    if (shippingId) {
      const r2 = await fetch(`/api/ml?path=${encodeURIComponent("shipments/" + shippingId)}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` }
      });
      shipment = await r2.json();
    }
    setDebugInfo(JSON.stringify({
      order_id: order.id,
      total_amount: order.total_amount,
      pack_id: order.pack_id,
      order_items: order.order_items?.map(i => ({ sku: i.item?.id, title: i.item?.title?.slice(0,40), unit_price: i.unit_price, qty: i.quantity, sale_fee: i.sale_fee })),
      shipping_id: shippingId,
      shipping_list_cost: shipment?.shipping_option?.list_cost,
      shipping_items_count: shipment?.shipping_items?.length,
    }, null, 2));
  }, []);

  const enrichMonth = useCallback(async (monthKey) => {
    if (!tokenRef.current || enrichedMonths.has(monthKey)) return;
    setEnrichingMonth(monthKey);
    try {
      const snapshot = await new Promise(resolve => setOrders(prev => { resolve(prev); return prev; }));
      // Deduplicar por orderId real (filas expandidas comparten el mismo orderId)
      const monthRows = snapshot.filter(o => o.date && o.date.slice(0, 7) === monthKey);
      const uniqueOrderIds = [...new Set(monthRows.map(o => o.orderId || o.id))];
      const rawLike = uniqueOrderIds.map(id => ({ id, total_amount: 0, date_created: monthKey, order_items: [], shipping: null }));
      const enriched = await enrichOrdersWithFees(rawLike, tokenRef.current);
      // Map por orderId
      const enrichedMap = new Map(enriched.map(e => [String(e.id), e]));
      setOrders(prev => prev.map(o => {
        const realId = o.orderId || o.id;
        const e = enrichedMap.get(String(realId));
        if (!e) return o;
        // Prorratear envío e impuestos entre las filas del mismo orderId
        const rowsForOrder = prev.filter(r => (r.orderId || r.id) === realId);
        const n = rowsForOrder.length || 1;
        return {
          ...o,
          saleFee: o.saleFee, // comisión ya es por item desde mapOrder
          shippingCost: (e.shippingCost || 0) / n,
          retencionIVA: (e.retencionIVA || 0) / n,
          retencionISR: (e.retencionISR || 0) / n,
          taxAmount: ((e.retencionIVA || 0) + (e.retencionISR || 0)) / n,
          paidAmount: o.salePrice - o.saleFee - (e.shippingCost || 0) / n - ((e.retencionIVA || 0) + (e.retencionISR || 0)) / n,
        };
      }));
      setEnrichedMonths(prev => new Set([...prev, monthKey]));
    } catch(err) { console.error("enrichMonth error", err); }
    finally { setEnrichingMonth(null); }
  }, [enrichedMonths]);

  const connectMock = async () => {
    setUseMock(true); setConnected(true);
    setConnectedUser("UZUSTORE"); setOrders(MOCK_ORDERS);
    await fetchLotes();
  };

  const paidOrders = orders.filter(o => o.status === "paid" && o.salePrice > 0);
  const ordersWithFIFO = calcFIFO(paidOrders, lotes);

  const totalVentas = ordersWithFIFO.reduce((s, o) => s + o.salePrice, 0);
  const totalNetoML = ordersWithFIFO.reduce((s, o) => s + (o.netoML || 0), 0);
  const totalBase = paidOrders.reduce((s, o) => s + o.baseGravable, 0);
  const totalCostos = ordersWithFIFO.reduce((s, o) => s + (o.costo || 0), 0);
  const isrRetenido = totalBase * TAX.ISR;
  const ivaRetenidoML = totalBase * TAX.IVA_ML;
  const ivaPendienteSAT = totalBase * TAX.IVA_SAT; // 8% que debes pagar al SAT
  // Utilidad real = neto ML - costo piezas - IVA pendiente al SAT
  const gananciaAntesTax = totalNetoML - totalCostos - ivaPendienteSAT;
  const gananciaNeta = gananciaAntesTax;

  const skusUnicos = [...new Map(paidOrders.map(o => [o.sku, { sku: o.sku, title: o.title }])).values()];

  if (!connected) return <AdminLogin onConnect={fetchOrders} onMock={connectMock} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Syne', sans-serif" }}>
      <style>{GS}</style>
      {showModalLote && <ModalLote skus={skusUnicos} onClose={() => setShowModalLote(false)} onSaved={fetchLotes} />}

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>{connectedUser}</div>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555" }}>
                Dashboard Fiscal · {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: loadingOrders ? "#FFE000" : "#00FF94", boxShadow: `0 0 8px ${loadingOrders ? "#FFE000" : "#00FF94"}` }} />
              <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#555" }}>
                {loadingOrders ? `Cargando... ${orders.length} órdenes` : useMock ? "DEMO" : `${orders.length} órdenes`}
              </span>
            </div>
            <button onClick={() => setShowModalLote(true)}
              style={{ background: "#FFE000", border: "none", borderRadius: 8, padding: "7px 14px", color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Agregar Lote
            </button>
            <button onClick={async () => {
                const orderId = prompt("ID de la orden a debuggear:", orders[0]?.orderId || orders[0]?.id || "");
                if (!orderId || !tokenRef.current) return;
                setDebugInfo("Consultando orden " + orderId + "...");
                const r1 = await fetch(`/api/ml?path=${encodeURIComponent("orders/" + orderId)}`, {
                  headers: { Authorization: `Bearer ${tokenRef.current}` }
                });
                const order = await r1.json();
                const shippingId = order.shipping?.id;
                let shipment = null;
                if (shippingId) {
                  const r2 = await fetch(`/api/ml?path=${encodeURIComponent("shipments/" + shippingId)}`, {
                    headers: { Authorization: `Bearer ${tokenRef.current}` }
                  });
                  shipment = await r2.json();
                }
                setDebugInfo(JSON.stringify({
                  order_id: order.id,
                  total_amount: order.total_amount,
                  order_items: order.order_items?.map(i => ({ sku: i.item?.id, title: i.item?.title, unit_price: i.unit_price, qty: i.quantity, sale_fee: i.sale_fee })),
                  pack_id: order.pack_id,
                  shipping_id: shippingId,
                  shipping_list_cost: shipment?.shipping_option?.list_cost,
                  shipping_base_cost: shipment?.base_cost,
                  shipping_items_count: shipment?.shipping_items?.length,
                }, null, 2));
              }}
              style={{ background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)", borderRadius: 8, padding: "6px 12px", color: "#00C9FF", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
              🔍 Debug
            </button>
            <button onClick={() => { setConnected(false); setUseMock(false); setOrders([]); }}
              style={{ background: "transparent", border: "1px solid #222", borderRadius: 8, padding: "6px 12px", color: "#555", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
              Desconectar
            </button>
          </div>
        </div>
      </div>

      {/* Loading banner */}
      {loadingOrders && (
        <div style={{ background: "rgba(255,224,0,0.06)", borderBottom: "1px solid rgba(255,224,0,0.15)", padding: "10px 32px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFE000", animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>
            Descargando órdenes y desglose de comisiones... {orders.length} procesadas
          </span>
        </div>
      )}

      {/* Debug panel */}
      {debugInfo && (
        <div style={{ background: "#0d1117", border: "1px solid #00C9FF", margin: "0 32px", borderRadius: 12, padding: 20, maxHeight: 400, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#00C9FF", letterSpacing: 2 }}>DEBUG · ORDEN DETALLE RAW</span>
            <button onClick={() => setDebugInfo(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <pre style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#aaa", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{debugInfo}</pre>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px", display: "flex" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ background: "none", border: "none", padding: "14px 20px", fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", color: activeTab === t ? "#FFE000" : "#555", borderBottom: activeTab === t ? "2px solid #FFE000" : "2px solid transparent", transition: "all 0.2s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 32 }}>
        {activeTab === "resumen" && (
          <Resumen
            ordersWithFIFO={ordersWithFIFO} paidOrders={paidOrders} lotes={lotes}
            totalVentas={totalVentas} totalNetoML={totalNetoML} totalCostos={totalCostos}
            gananciaAntesTax={gananciaAntesTax} isrRetenido={isrRetenido}
            ivaPendienteSAT={ivaPendienteSAT} gananciaNeta={gananciaNeta}
            onAgregarLote={() => setShowModalLote(true)}
          />
        )}
        {activeTab === "mensual" && (
          <Mensual
            ordersWithFIFO={ordersWithFIFO} paidOrders={paidOrders}
            totalVentas={totalVentas} totalNetoML={totalNetoML} totalCostos={totalCostos}
            gananciaAntesTax={gananciaAntesTax} isrRetenido={isrRetenido}
            ivaRetenidoML={ivaRetenidoML} ivaPendienteSAT={ivaPendienteSAT}
          />
        )}
        {activeTab === "inventario" && (
          <Inventario lotes={lotes} loadingLotes={loadingLotes} onAgregarLote={() => setShowModalLote(true)} onLoteEdited={fetchLotes} />
        )}
        {activeTab === "compras" && (
          <InventarioCarrilB onLoteEdited={fetchLotes} />
        )}
        {activeTab === "impuestos" && (
          <Impuestos
            totalBase={totalBase} isrRetenido={isrRetenido}
            ivaRetenidoML={ivaRetenidoML} ivaPendienteSAT={ivaPendienteSAT}
          />
        )}
        {activeTab === "ordenes" && (
          <Ordenes ordersWithFIFO={ordersWithFIFO} orders={orders} onLoteAdded={fetchLotes} enrichedMonths={enrichedMonths} enrichMonth={enrichMonth} enrichingMonth={enrichingMonth} onDebug={handleDebug} />
        )}
        {activeTab === "distribuidores" && (
          <Distribuidores />
        )}
      </div>
    </div>
  );
}
