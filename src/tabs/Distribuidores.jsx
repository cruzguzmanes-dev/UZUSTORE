import React, { useState, useEffect } from "react";
import { fmt, sb } from "../utils";
import Loader from "../components/Loader";

const SLUGS   = ["gaticueva", "friki", "practica"];
const NOMBRES = { gaticueva: "Gaticueva", friki: "Friki", practica: "Práctica" };
const COLORS  = { gaticueva: "#00C9FF", friki: "#FF6B9D", practica: "#00FF94" };

// Estado inicial vacío por slug (dinámico según SLUGS)
const emptyBySlug    = () => Object.fromEntries(SLUGS.map(s => [s, []]));
const settingsBySlug = () => Object.fromEntries(SLUGS.map(s => [s, { modo_precio: "venta" }]));

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });

export default function Distribuidores() {
  const [data,         setData]         = useState(emptyBySlug);
  const [pagos,        setPagos]        = useState(emptyBySlug);
  const [solicitudes,  setSolicitudes]  = useState(emptyBySlug);
  const [sueltas,      setSueltas]      = useState(emptyBySlug);
  const [lotes,        setLotes]        = useState([]);
  const [distSettings, setDistSettings] = useState(settingsBySlug);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("gaticueva");
  const [showAdd, setShowAdd] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [invArr, lotesData, pagosArr, settingsArr, solArr, sueltasArr] = await Promise.all([
        Promise.all(SLUGS.map(s => fetch(`/api/distribuidor/inventario?distribuidor=${s}`).then(r => r.ok ? r.json() : []))),
        sb("lotes?select=id,titulo,sku,costo_unitario&order=titulo.asc").catch(() => []),
        Promise.all(SLUGS.map(s => fetch(`/api/distribuidor/pagos?slug=${s}`).then(r => r.ok ? r.json() : []))),
        Promise.all(SLUGS.map(s => fetch(`/api/distribuidor/settings?slug=${s}`).then(r => r.ok ? r.json() : {}))),
        Promise.all(SLUGS.map(s => fetch(`/api/distribuidor/solicitudes?slug=${s}&estado=pendiente`).then(r => r.ok ? r.json() : []))),
        Promise.all(SLUGS.map(s => fetch(`/api/distribuidor/historial?sueltas=${s}&estado=confirmada`).then(r => r.ok ? r.json() : []))),
      ]);
      const bySlug = (arr) => Object.fromEntries(SLUGS.map((s, i) => [s, arr[i] || []]));
      setData(bySlug(invArr));
      setLotes(lotesData || []);
      setPagos(bySlug(pagosArr));
      setSolicitudes(bySlug(solArr));
      setSueltas(bySlug(sueltasArr));
      setDistSettings(Object.fromEntries(SLUGS.map((s, i) => [s, { modo_precio: settingsArr[i]?.modo_precio || "venta" }])));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateModoPrecio = async (slug, modo) => {
    // Optimistic update
    setDistSettings(prev => ({ ...prev, [slug]: { ...prev[slug], modo_precio: modo } }));
    try {
      const res = await fetch("/api/distribuidor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, modo_precio: modo }),
      });
      if (!res.ok) throw new Error("Error actualizando");
    } catch (e) {
      // Revert on error
      setDistSettings(prev => ({ ...prev, [slug]: { ...prev[slug], modo_precio: modo === "venta" ? "mayoreo" : "venta" } }));
      alert("Error: " + e.message);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const setMayoreo = async (id, valor, loteSku) => {
    await fetch(`/api/distribuidor/inventario?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        precio_mayoreo: parseFloat(valor) || 0,
        ...(loteSku !== undefined && { lote_sku: loteSku }),
      }),
    });
    fetchAll();
  };

  const crearArticulo = async ({ nombre, foto_url, precio_mayoreo, cantidad }) => {
    const res = await fetch("/api/distribuidor/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distribuidor: tab,
        nombre: nombre || null,
        foto_url: foto_url || null,
        precio_mayoreo: precio_mayoreo || null,
        cantidad: parseInt(cantidad) || 1,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Error creando artículo");
    }
    await fetchAll();
  };

  const eliminarArticulo = async (id) => {
    const res = await fetch(`/api/distribuidor/inventario?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Error eliminando");
    }
    await fetchAll();
  };

  const actualizarFoto = async (id, foto_url) => {
    const res = await fetch(`/api/distribuidor/inventario?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto_url }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Error actualizando foto");
    }
    await fetchAll();
  };

  const resolverSolicitud = async (id, estado, montoDeuda = 0) => {
    const res = await fetch(`/api/distribuidor/solicitudes?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, ...(estado === "aceptado" && { monto_deuda: montoDeuda || 0 }) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Error procesando solicitud");
    }
    await fetchAll();
  };

  const registrarPago = async (slug, monto, tipo, notas) => {
    const res = await fetch("/api/distribuidor/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, monto, tipo, notas }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Error registrando pago");
    }
    fetchAll();
  };

  // Resumen total
  const resumen = SLUGS.map(slug => {
    // Solo inventario activo (excluye piezas que el normal propuso y aún no se aprueban)
    const items       = (data[slug] || []).filter(i => (i.estado || "activo") === "activo");
    const sueltasConf = sueltas[slug] || [];
    const vendidasInv = items.reduce((s, i) => s + (i.vendidas || 0), 0);
    const vendidasSue = sueltasConf.reduce((s, v) => s + (v.cantidad || 1), 0);
    const vendidas    = vendidasInv + vendidasSue;
    const totalVentas = items.reduce((s, i) => s + (i.precio_venta * (i.vendidas || 0)), 0);
    const teDebenInv  = items.reduce((s, i) => s + ((i.precio_mayoreo || 0) * (i.vendidas || 0)), 0);
    const teDebenSue  = sueltasConf.reduce((s, v) => s + ((v.precio_mayoreo || 0) * (v.cantidad || 1)), 0);
    const teDeben     = teDebenInv + teDebenSue;
    const ganancia    = totalVentas - teDebenInv;
    const stock       = items.reduce((s, i) => s + i.cantidad, 0);
    const pgs         = pagos[slug] || [];
    const totalPagado = pgs.reduce((s, p) => s + p.monto, 0);                        // total recibido
    const pagadoVentas= pgs.reduce((s, p) => s + (p.monto - (p.monto_deuda || 0)), 0); // aplicado a ventas
    const abonoDeuda  = pgs.reduce((s, p) => s + (p.monto_deuda || 0), 0);           // saldación de deuda vieja
    const saldo       = teDeben - pagadoVentas;
    return { slug, vendidas, totalVentas, teDeben, ganancia, stock, items, totalPagado, pagadoVentas, abonoDeuda, saldo };
  });

  const totalSaldo = resumen.reduce((s, r) => s + r.saldo, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif" }}>
          🏪 Distribuidores
        </h2>
        <p style={{ color: "#888", margin: 0, fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
          Inventario · Precios · Cortes
        </p>
      </div>

      {/* Resumen saldo pendiente */}
      <div style={{
        background: "rgba(255,224,0,0.05)", border: "1px solid rgba(255,224,0,0.2)",
        borderRadius: 14, padding: 20, marginBottom: 28,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
      }}>
        {resumen.map(r => (
          <div key={r.slug} style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
              {NOMBRES[r.slug]}
            </p>
            <p style={{ margin: "0 0 2px 0", fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: r.saldo > 0 ? COLORS[r.slug] : "#3a3a3a" }}>
              {fmt(r.saldo)}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
              {r.vendidas} vendidas
            </p>
          </div>
        ))}
        <div style={{ textAlign: "center", gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
            Saldo total pendiente
          </p>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>
            {fmt(totalSaldo)}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: 14, marginBottom: 20, color: "#ff8080", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {SLUGS.map(s => (
          <button key={s} onClick={() => setTab(s)} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid",
            borderColor: tab === s ? COLORS[s] : "#2a2a2a",
            background: tab === s ? `${COLORS[s]}18` : "transparent",
            color: tab === s ? COLORS[s] : "#666",
            fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
          }}>
            {NOMBRES[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size={120} message="Cargando distribuidores" />
      ) : (
        <DistribuidorDetalle
          slug={tab}
          items={(data[tab] || []).filter(i => (i.estado || "activo") === "activo")}
          resumen={resumen.find(r => r.slug === tab)}
          color={COLORS[tab]}
          lotes={lotes}
          pagos={pagos[tab] || []}
          solicitudes={solicitudes[tab] || []}
          modoPrecio={distSettings[tab]?.modo_precio || "venta"}
          onSetMayoreo={setMayoreo}
          onRegistrarPago={registrarPago}
          onUpdateModoPrecio={updateModoPrecio}
          onEliminar={eliminarArticulo}
          onActualizarFoto={actualizarFoto}
          onResolverSolicitud={resolverSolicitud}
        />
      )}

      {/* ─── Botón flotante: alta rápida ─── */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label={`Agregar artículo a ${NOMBRES[tab]}`}
        style={{
          position: "fixed",
          right: "max(20px, env(safe-area-inset-right, 20px))",
          bottom: "max(24px, env(safe-area-inset-bottom, 24px))",
          width: 58, height: 58, borderRadius: "50%",
          background: COLORS[tab], border: "none",
          color: "#000", fontSize: 30, fontWeight: 700, lineHeight: 1,
          cursor: "pointer", zIndex: 900,
          boxShadow: `0 6px 20px ${COLORS[tab]}55, 0 2px 6px rgba(0,0,0,0.4)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        +
      </button>

      {showAdd && (
        <QuickAddSheet
          slug={tab}
          color={COLORS[tab]}
          onClose={() => setShowAdd(false)}
          onCreate={crearArticulo}
        />
      )}
    </div>
  );
}

/* ─── Compresión de imagen (cámara / galería) ─── */
function compressImage(file, maxSize = 400, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width  = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── Sheet de alta rápida (desde el admin) ─── */
function QuickAddSheet({ slug, color, onClose, onCreate }) {
  const [nombre,   setNombre]   = useState("");
  const [mayoreo,  setMayoreo]  = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [preview,  setPreview]  = useState("");
  const [fotoB64,  setFotoB64]  = useState("");
  const [comprimiendo, setComprimiendo] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprimiendo(true);
    setError("");
    try {
      const b64 = await compressImage(file);
      setFotoB64(b64);
      setPreview(b64);
    } catch (err) {
      setError("No se pudo procesar la foto");
    } finally {
      setComprimiendo(false);
    }
  };

  const guardar = async (cerrar) => {
    setSaving(true);
    setError("");
    try {
      await onCreate({
        nombre: nombre.trim(),
        foto_url: fotoB64,
        precio_mayoreo: mayoreo ? parseFloat(mayoreo) : null,
        cantidad,
      });
      if (cerrar) {
        onClose();
      } else {
        // "Guardar y agregar otro" — limpia y deja el sheet abierto
        setNombre(""); setMayoreo(""); setCantidad("1");
        setPreview(""); setFotoB64("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
    padding: "12px 14px", color: "#fff", fontSize: 16,
    fontFamily: "'Space Mono', monospace", outline: "none", boxSizing: "border-box",
  };
  const lbl = {
    display: "block", fontSize: 9, color: "#666", letterSpacing: 2,
    textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 6,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        animation: "fadeInDist 0.15s ease",
      }}
    >
      <style>{`
        @keyframes fadeInDist { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUpDist { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: 22, width: "calc(100% - 32px)", maxWidth: 420,
          maxHeight: "88vh", overflowY: "auto", animation: "slideUpDist 0.2s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <p style={{ margin: "0 0 3px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              ➕ Agregar artículo
            </p>
            <p style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: 12, color }}>
              {NOMBRES[slug]}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Foto */}
        <label style={lbl}>Foto</label>
        <div style={{ marginBottom: 14 }}>
          {preview ? (
            <div style={{ textAlign: "center" }}>
              <img src={preview} alt="Preview" style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 8, display: "block", margin: "0 auto" }} />
              <button type="button" onClick={() => { setPreview(""); setFotoB64(""); }}
                style={{ marginTop: 10, background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
                Cambiar foto
              </button>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" capture="environment" onChange={handleFoto}
                style={{ display: "none" }} id="quickFotoInput" />
              <label htmlFor="quickFotoInput" style={{
                display: "block", border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 10,
                padding: "22px 16px", textAlign: "center", cursor: "pointer",
              }}>
                <p style={{ margin: "0 0 6px 0", color: "#888", fontSize: 14 }}>
                  {comprimiendo ? "Procesando…" : "📸 Tomar / elegir foto"}
                </p>
                <p style={{ margin: 0, color: "#555", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                  Opcional
                </p>
              </label>
            </>
          )}
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Nombre <span style={{ letterSpacing: 0, textTransform: "none", color: "#444" }}>(opcional)</span></label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Goku UI" style={inp} />
        </div>

        {/* Precio mayoreo + cantidad */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <label style={lbl}>Precio $ <span style={{ letterSpacing: 0, textTransform: "none", color: "#444" }}>(le cobras)</span></label>
            <input type="number" inputMode="decimal" step="0.01" min="0" value={mayoreo}
              onChange={e => setMayoreo(e.target.value)} placeholder="Ej: 350" style={inp} />
          </div>
          <div>
            <label style={lbl}>Unidades</label>
            <input type="number" inputMode="numeric" min="1" value={cantidad}
              onChange={e => setCantidad(e.target.value)} style={inp} />
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: 8, padding: "10px 14px", color: "#ff8080",
            fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => guardar(false)} disabled={saving || comprimiendo}
            style={{
              width: "100%", background: saving || comprimiendo ? "#333" : "rgba(255,255,255,0.06)",
              color: saving || comprimiendo ? "#666" : "#ccc", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 700,
              fontFamily: "'Space Mono', monospace", cursor: saving || comprimiendo ? "not-allowed" : "pointer",
            }}>
            {saving ? "Guardando…" : "+ Guardar y agregar otro"}
          </button>
          <button onClick={() => guardar(true)} disabled={saving || comprimiendo}
            style={{
              width: "100%", background: saving || comprimiendo ? "#333" : color,
              color: saving || comprimiendo ? "#666" : "#000", border: "none",
              borderRadius: 10, padding: 15, fontSize: 15, fontWeight: 700,
              fontFamily: "'Syne', sans-serif", cursor: saving || comprimiendo ? "not-allowed" : "pointer",
            }}>
            {saving ? "Guardando…" : "Guardar y cerrar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle switch ─── */
function Toggle({ checked, onChange, color = "#FFE000" }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        background: checked ? color : "#2a2a2a",
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute",
        top: 3, left: checked ? 23 : 3,
        width: 18, height: 18,
        borderRadius: "50%",
        background: checked ? "#000" : "#555",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────── */
function DistribuidorDetalle({ slug, items, resumen, color, lotes, pagos, solicitudes = [], modoPrecio = "venta", onSetMayoreo, onRegistrarPago, onUpdateModoPrecio, onEliminar, onActualizarFoto, onResolverSolicitud }) {
  const [pagoSheet,    setPagoSheet]    = useState(null); // null | 'completo' | 'parcial' | 'historial'
  const [parcialMonto, setParcialMonto] = useState("");
  const [parcialNotas, setParcialNotas] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [resolviendo,  setResolviendo]  = useState(null);
  const [aceptarPago,  setAceptarPago]  = useState(null); // solicitud en split de aceptación
  const [deudaInput,   setDeudaInput]   = useState("");

  const pendientes = solicitudes.filter(s => s.estado === "pendiente");

  const { teDeben, totalPagado, pagadoVentas, abonoDeuda, saldo } = resumen;

  const handleResolver = async (id, estado, montoDeuda = 0) => {
    setResolviendo(id);
    try {
      await onResolverSolicitud(id, estado, montoDeuda);
      setAceptarPago(null);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setResolviendo(null);
    }
  };

  // Al aceptar: si el pago supera el saldo de ventas, abre el split de deuda
  const abrirAceptar = (s) => {
    if (s.es_abono) { handleResolver(s.id, "aceptado", s.monto); return; } // abono → todo a deuda
    const excedente = Math.max(0, s.monto - Math.max(0, saldo));
    if (excedente <= 0) handleResolver(s.id, "aceptado", 0);
    else { setDeudaInput(String(excedente)); setAceptarPago(s); }
  };

  const handlePago = async (tipo) => {
    const monto = tipo === "completo" ? saldo : parseFloat(parcialMonto);
    if (!monto || monto <= 0) return;
    setSaving(true);
    try {
      await onRegistrarPago(slug, monto, tipo, parcialNotas || null);
      setPagoSheet(null);
      setParcialMonto("");
      setParcialNotas("");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const sheetStyle = {
    position: "fixed", inset: 0, zIndex: 999,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
    animation: "fadeInDist 0.15s ease",
  };
  const cardStyle = {
    background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 22,
    width: "calc(100% - 32px)", maxWidth: 420,
    animation: "slideUpDist 0.2s ease",
    maxHeight: "80vh", overflowY: "auto",
  };

  return (
    <>
      <style>{`
        @keyframes fadeInDist { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUpDist { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .pago-inp {
          width:100%; background:#111; border:1px solid #2a2a2a; border-radius:8px;
          padding:12px 14px; color:#fff; font-size:16px;
          font-family:'Space Mono',monospace; outline:none; box-sizing:border-box; margin-bottom:12px;
        }
        .pago-lbl {
          display:block; font-size:9px; color:#666; letter-spacing:2px;
          text-transform:uppercase; font-family:'Space Mono',monospace; margin-bottom:6px;
        }
        .hist-pago-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .hist-pago-row:last-child { border-bottom:none; }
      `}</style>

      {/* ── Sheet: aceptar pago con saldación de deuda ── */}
      {aceptarPago && (() => {
        const monto = aceptarPago.monto;
        const deuda = Math.min(monto, Math.max(0, parseFloat(deudaInput) || 0));
        const aVentas = monto - deuda;
        return (
          <div style={sheetStyle} onClick={() => setAceptarPago(null)}>
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
              <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
                ✓ Aceptar pago de {fmt(monto)}
              </p>
              <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#888" }}>
                Saldo de ventas: {fmt(Math.max(0, saldo))}. El excedente puedes marcarlo como saldación de deuda vieja (no se abona a ventas futuras).
              </p>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#ccc" }}><span>A ventas</span><span style={{ fontWeight: 700 }}>{fmt(aVentas)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#7ecc7e" }}><span>A deuda vieja</span><span style={{ fontWeight: 700 }}>{fmt(deuda)}</span></div>
              </div>
              <label className="pago-lbl">Saldación de deuda $</label>
              <input className="pago-inp" type="number" step="0.01" min="0" value={deudaInput} onChange={e => setDeudaInput(e.target.value)} placeholder="0" />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setAceptarPago(null)} style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => handleResolver(aceptarPago.id, "aceptado", deuda)} disabled={resolviendo === aceptarPago.id}
                  style={{ flex: 2, background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: resolviendo === aceptarPago.id ? "not-allowed" : "pointer" }}>
                  {resolviendo === aceptarPago.id ? "Aceptando..." : "✓ Confirmar"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Sheet: Pago completo ── */}
      {pagoSheet === "completo" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💰 Pago completo
            </p>
            <p style={{ margin: "0 0 22px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              {NOMBRES[slug]} liquidará todo el saldo pendiente
            </p>

            <div style={{ background: "rgba(255,224,0,0.06)", border: "1px solid rgba(255,224,0,0.2)", borderRadius: 12, padding: 16, marginBottom: 22, textAlign: "center" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Monto a registrar</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#FFE000" }}>{fmt(saldo)}</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPagoSheet(null)}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => handlePago("completo")} disabled={saving || saldo <= 0}
                style={{ flex: 2, background: saving || saldo <= 0 ? "#333" : "#1e3a1e", border: saving || saldo <= 0 ? "1px solid #333" : "1px solid #2d5a2d", color: saving || saldo <= 0 ? "#555" : "#7ecc7e", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving || saldo <= 0 ? "not-allowed" : "pointer" }}>
                {saving ? "Registrando..." : "✓ Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Pago parcial ── */}
      {pagoSheet === "parcial" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 6px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
              💸 Pago parcial
            </p>
            <p style={{ margin: "0 0 20px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              Saldo pendiente: <span style={{ color: "#FFE000" }}>{fmt(saldo)}</span>
            </p>

            <label className="pago-lbl">Monto pagado $</label>
            <input className="pago-inp" type="number" step="0.01" min="1"
              value={parcialMonto} onChange={e => setParcialMonto(e.target.value)}
              placeholder="Ej: 1000" autoFocus />

            <label className="pago-lbl">Nota (opcional)</label>
            <input className="pago-inp" type="text"
              value={parcialNotas} onChange={e => setParcialNotas(e.target.value)}
              placeholder="Ej: transferencia 15 mar" />

            {parcialMonto && parseFloat(parcialMonto) > 0 && (
              <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", textAlign: "center" }}>
                Quedará pendiente: <strong style={{ color: saldo - parseFloat(parcialMonto) <= 0 ? "#7ecc7e" : "#FFE000" }}>
                  {fmt(Math.max(0, saldo - parseFloat(parcialMonto)))}
                </strong>
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setPagoSheet(null); setParcialMonto(""); setParcialNotas(""); }}
                style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 12, padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => handlePago("parcial")} disabled={saving || !parcialMonto || parseFloat(parcialMonto) <= 0}
                style={{ flex: 2, background: saving || !parcialMonto ? "#333" : "#1a2a3a", border: saving || !parcialMonto ? "1px solid #333" : "1px solid #2a4a5a", color: saving || !parcialMonto ? "#555" : "#7ec5cc", borderRadius: 12, padding: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving || !parcialMonto ? "not-allowed" : "pointer" }}>
                {saving ? "Registrando..." : "✓ Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Historial de pagos ── */}
      {pagoSheet === "historial" && (
        <div style={sheetStyle} onClick={() => setPagoSheet(null)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                🧾 Historial de pagos
              </p>
              <button onClick={() => setPagoSheet(null)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ margin: "0 0 16px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666" }}>
              {NOMBRES[slug]} · {pagos.length} registro{pagos.length !== 1 ? "s" : ""}
            </p>

            {pagos.length === 0 ? (
              <p style={{ textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 12, padding: "20px 0" }}>
                Sin pagos registrados aún
              </p>
            ) : (
              <>
                {/* Resumen */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 3px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Total cobrado</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#7ecc7e" }}>{fmt(totalPagado)}</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 3px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>Saldo</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>{fmt(saldo)}</p>
                  </div>
                </div>

                {/* Lista */}
                {pagos.map(p => (
                  <div key={p.id} className="hist-pago-row">
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#666", marginBottom: 2 }}>
                        {fmtFecha(p.created_at)}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{
                          background: p.tipo === "completo" ? "rgba(126,204,126,0.12)" : "rgba(126,197,204,0.12)",
                          border: `1px solid ${p.tipo === "completo" ? "rgba(126,204,126,0.3)" : "rgba(126,197,204,0.3)"}`,
                          color: p.tipo === "completo" ? "#7ecc7e" : "#7ec5cc",
                          borderRadius: 4, padding: "1px 7px",
                          fontSize: 9, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1,
                        }}>
                          {p.tipo}
                        </span>
                        {p.notas && (
                          <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{p.notas}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: "#7ecc7e" }}>
                      {fmt(p.monto)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Modo de inventario (toggle) ─── */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: "12px 16px",
        marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ margin: "0 0 2px 0", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: "#fff" }}>
            Modo de inventario
          </p>
          <p style={{ margin: 0, fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#666" }}>
            {modoPrecio === "venta"
              ? "Registra su propio precio de venta"
              : "Usa el precio que le asigné (mayoreo)"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: modoPrecio === "venta" ? color : "#444" }}>
            Su precio
          </span>
          <Toggle
            checked={modoPrecio === "mayoreo"}
            onChange={(v) => onUpdateModoPrecio(slug, v ? "mayoreo" : "venta")}
            color={color}
          />
          <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: modoPrecio === "mayoreo" ? color : "#444" }}>
            Mi precio
          </span>
        </div>
      </div>

      {/* ─── Corte del distribuidor ─── */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${color}33`,
        borderRadius: 14, padding: 18, marginBottom: 16,
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
      }}>
        <CorteItem label="En stock"          value={resumen.stock} />
        <CorteItem label="Vendidas"          value={resumen.vendidas} />
        <CorteItem label="Sus ventas totales" value={fmt(resumen.totalVentas)} />
        <CorteItem label="Total a cobrar"    value={fmt(teDeben)} />
        <CorteItem label="Pagado a ventas"   value={fmt(pagadoVentas)} color="#7ecc7e" style={abonoDeuda > 0 ? {} : { gridColumn: "1 / -1" }} />
        {abonoDeuda > 0 && (
          <CorteItem label="Abonado a deuda"   value={fmt(abonoDeuda)} color="#7ec5cc" />
        )}
      </div>

      {/* ─── Pagos por aceptar (solicitudes del distribuidor) ─── */}
      {pendientes.length > 0 && (
        <div style={{
          background: "rgba(126,197,204,0.05)", border: "1px solid rgba(126,197,204,0.3)",
          borderRadius: 14, padding: 18, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#7ec5cc" }}>
            💳 Pagos por aceptar ({pendientes.length})
          </p>
          {pendientes.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                  {fmt(s.monto)} <span style={{ fontSize: 10, color: s.es_abono ? "#7ecc7e" : "#666" }}>({s.es_abono ? "🏦 abono a deuda" : s.tipo})</span>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#666" }}>
                  Solicitado {fmtFecha(s.created_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button disabled={resolviendo === s.id} onClick={() => abrirAceptar(s)}
                  style={{ background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, cursor: resolviendo === s.id ? "not-allowed" : "pointer" }}>
                  {resolviendo === s.id ? "..." : "✓ Aceptar"}
                </button>
                <button disabled={resolviendo === s.id} onClick={() => handleResolver(s.id, "rechazado")}
                  style={{ background: "#3a1a1a", border: "1px solid #5a2a2a", color: "#ff8080", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: resolviendo === s.id ? "not-allowed" : "pointer" }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Saldo pendiente + botones de pago ─── */}
      <div style={{
        background: saldo > 0 ? "rgba(255,224,0,0.05)" : "rgba(0,200,100,0.05)",
        border: `1px solid ${saldo > 0 ? "rgba(255,224,0,0.25)" : "rgba(0,200,100,0.2)"}`,
        borderRadius: 14, padding: 18, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: saldo > 0 ? 14 : 0 }}>
          <div>
            <p style={{ margin: "0 0 3px 0", fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
              Saldo pendiente
            </p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: saldo > 0 ? "#FFE000" : "#7ecc7e" }}>
              {fmt(saldo)}
              {saldo <= 0 && <span style={{ fontSize: 12, color: "#7ecc7e", marginLeft: 8 }}>✓ Al corriente</span>}
            </p>
          </div>
          <button
            onClick={() => setPagoSheet("historial")}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
            🧾 Ver pagos
          </button>
        </div>

        {saldo > 0 && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setPagoSheet("parcial")}
              style={{ flex: 1, background: "#1a2a3a", border: "1px solid #2a4a5a", color: "#7ec5cc", borderRadius: 10, padding: "11px 0", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              💸 Pago parcial
            </button>
            <button
              onClick={() => setPagoSheet("completo")}
              style={{ flex: 1, background: "#1e3a1e", border: "1px solid #2d5a2d", color: "#7ecc7e", borderRadius: 10, padding: "11px 0", fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              💰 Pago completo
            </button>
          </div>
        )}
      </div>

      {/* ─── Lista de artículos con mayoreo editable ─── */}
      {items.length === 0 ? (
        <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          Sin artículos aún
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} color={color} lotes={lotes} onSetMayoreo={onSetMayoreo} onEliminar={onEliminar} onActualizarFoto={onActualizarFoto} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────── */
function ItemRow({ item, color, lotes, onSetMayoreo, onEliminar, onActualizarFoto }) {
  const [editando,     setEditando]     = useState(false);
  const [val,          setVal]          = useState(item.precio_mayoreo || "");
  const [selectedSku,  setSelectedSku]  = useState(item.lote_sku || "");
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [borrando,     setBorrando]     = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const vendidas = item.vendidas || 0;
  const mayoreo  = item.precio_mayoreo || 0;
  const teDebe   = mayoreo * vendidas;
  const ganancia = (item.precio_venta - mayoreo) * vendidas;

  // Ganancia del dueño si está vinculado a un lote
  const loteVinculado   = item.lote_sku ? lotes.find(l => l.sku === item.lote_sku) : null;
  const miGananciaUnit  = loteVinculado ? (mayoreo - loteVinculado.costo_unitario) : null;
  const miGananciaTotal = miGananciaUnit !== null && vendidas > 0 ? miGananciaUnit * vendidas : null;

  const handleLotePick = (sku) => {
    setSelectedSku(sku);
    if (sku) {
      const lote = lotes.find(l => l.sku === sku);
      if (lote) setVal(String(lote.costo_unitario));
    }
  };

  const handleManualVal = (v) => {
    setVal(v);
    setSelectedSku("");
  };

  const guardar = () => {
    onSetMayoreo(item.id, val, selectedSku);
    setEditando(false);
  };

  const cancelar = () => {
    setVal(item.precio_mayoreo || "");
    setSelectedSku(item.lote_sku || "");
    setEditando(false);
  };

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onActualizarFoto) return;
    setSubiendoFoto(true);
    try {
      const b64 = await compressImage(file);
      await onActualizarFoto(item.id, b64);
    } catch (err) {
      alert("Error con la foto: " + (err.message || err));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleEliminar = async () => {
    setBorrando(true);
    try {
      await onEliminar(item.id);
    } catch (err) {
      alert("Error: " + err.message);
      setBorrando(false);
      setConfirmDel(false);
    }
  };

  const fotoId = `foto-admin-${item.id}`;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {/* Foto — clic para cambiarla (solo dueño) */}
      <label htmlFor={fotoId} style={{ position: "relative", flexShrink: 0, cursor: onActualizarFoto ? "pointer" : "default", display: "block", width: 56, height: 56 }}>
        {item.foto_url
          ? <img src={item.foto_url} alt={item.nombre} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", display: "block" }} />
          : <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 22 }}>📦</div>
        }
        {onActualizarFoto && (
          <span style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(0,0,0,0.6)", color: "#ddd", fontSize: 8,
            textAlign: "center", padding: "2px 0", borderRadius: "0 0 8px 8px",
            fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
          }}>
            {subiendoFoto ? "..." : "cambiar"}
          </span>
        )}
        <input id={fotoId} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} disabled={subiendoFoto} />
      </label>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {item.nombre || "Sin nombre"}
          </div>
          {onEliminar && (
            confirmDel ? (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={handleEliminar} disabled={borrando}
                  style={{ background: "#3a1a1a", border: "1px solid #5a2a2a", color: "#ff8080", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
                  {borrando ? "..." : "Sí, borrar"}
                </button>
                <button onClick={() => setConfirmDel(false)} disabled={borrando}
                  style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>
                🗑
              </button>
            )
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
          {item.precio_venta > 0
            ? <span style={{ color }}>Precio: {fmt(item.precio_venta)}</span>
            : <span style={{ color: "#444", fontStyle: "italic" }}>Precio privado</span>
          }
          <span style={{ color: "#888" }}>Stock: {item.cantidad}</span>
          <span style={{ color: "#aaa" }}>Vendidas: {vendidas}</span>
        </div>

        {/* Mayoreo editable */}
        <div style={{ marginBottom: vendidas > 0 && mayoreo > 0 ? 8 : 0 }}>
          {editando ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lotes.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#555", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    Vincular a lote del inventario
                  </div>
                  <select
                    value={selectedSku}
                    onChange={e => handleLotePick(e.target.value)}
                    style={{ width: "100%", background: "#111", border: `1px solid ${selectedSku ? "#444" : "#2a2a2a"}`, borderRadius: 6, padding: "7px 10px", color: selectedSku ? "#fff" : "#555", fontSize: 12, fontFamily: "'Space Mono', monospace", outline: "none", cursor: "pointer" }}>
                    <option value="">— Elegir del inventario —</option>
                    {lotes.map(l => (
                      <option key={l.id} value={l.sku}>
                        {l.titulo}  ·  SKU: {l.sku}  ·  {fmt(l.costo_unitario)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>$ Mayoreo</span>
                <input
                  type="number" value={val} onChange={e => handleManualVal(e.target.value)}
                  step="0.01" placeholder="0.00" autoFocus={lotes.length === 0}
                  style={{ flex: 1, minWidth: 0, background: "#111", border: "1px solid #444", borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none" }} />
                <button onClick={guardar} disabled={!val}
                  style={{ background: val ? "#FFE000" : "#333", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: val ? "pointer" : "not-allowed", color: val ? "#000" : "#666", flexShrink: 0 }}>✓</button>
                <button onClick={cancelar}
                  style={{ background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Mayoreo:</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: mayoreo > 0 ? "#fff" : "#555" }}>
                {mayoreo > 0 ? fmt(mayoreo) : "—"}
              </span>
              {item.lote_sku && (
                <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 7px", fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace" }}>
                  {item.lote_sku}
                </span>
              )}
              <button onClick={() => setEditando(true)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#aaa", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
                editar
              </button>
            </div>
          )}
        </div>

        {/* Resumen financiero */}
        {vendidas > 0 && mayoreo > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
            <span style={{ color: "#ff8080" }}>Te debe: {fmt(teDebe)}</span>
            <span style={{ color: "#7ecc7e" }}>Su gan.: {fmt(ganancia)}</span>
            {miGananciaTotal !== null && (
              <span style={{ color: "#FFE000" }}>Mi gan.: {fmt(miGananciaTotal)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
function CorteItem({ label, value, highlight, color, style }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, textAlign: "center", ...style }}>
      <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: color || (highlight ? "#FFE000" : "#fff") }}>
        {value}
      </p>
    </div>
  );
}
