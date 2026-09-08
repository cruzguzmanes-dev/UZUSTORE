"use client";

import { useEffect, useRef, useState } from "react";

const ELEMENT_ID = "barcode-scanner-region";
const COOLDOWN_MS = 1200; // en modo continuo, evita que el mismo código dispare varias veces mientras sigue frente a la cámara

// Modal con la cámara abierta, leyendo QR y los formatos de barras que traen los
// productos de fábrica (EAN/UPC) además de Code128/39 por si imprimen sus propias
// etiquetas. Todo corre en el navegador -- no manda nada a ningún servicio externo.
//
// continuo=false (default, para el form de item): se detiene después de la primera
// lectura -- el padre cierra el modal.
// continuo=true (para "Nueva venta"): sigue leyendo una tras otra, con un pequeño
// cooldown para no releer el mismo código de inmediato. El padre decide cuándo cerrar.
export default function BarcodeScanner({ onScan, onClose, continuo = false, statusText }) {
  const scannerRef = useRef(null);
  const bloqueadoRef = useRef(false); // modo single-shot
  const enCooldownRef = useRef(false); // modo continuo
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");

  // El padre pasa una función nueva de onScan en cada render suyo (ej. cada vez que se
  // agrega un producto al carrito) -- si el efecto de abajo dependiera de onScan
  // directamente, reiniciaría la cámara después de cada escaneo. Con el ref, siempre
  // llama a la versión más reciente sin tener que reabrir la cámara.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let activo = true;

    import("html5-qrcode").then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (!activo) return;
      const html5Qrcode = new Html5Qrcode(ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      scannerRef.current = html5Qrcode;

      html5Qrcode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (continuo) {
              if (enCooldownRef.current) return;
              enCooldownRef.current = true;
              onScanRef.current(decodedText);
              setTimeout(() => {
                enCooldownRef.current = false;
              }, COOLDOWN_MS);
            } else {
              if (bloqueadoRef.current) return; // ignora lecturas repetidas del mismo frame
              bloqueadoRef.current = true;
              onScanRef.current(decodedText);
            }
          },
          () => {} // "no se detectó nada en este frame" -- se dispara constantemente, no es error real
        )
        .catch(() => setError("No se pudo abrir la cámara -- revisa que le hayas dado permiso al navegador."));
    });

    return () => {
      activo = false;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [continuo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-white/10 bg-brand-dark p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-extrabold text-white">Escanear código</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red-400">⚠ {error}</p>}
        <div id={ELEMENT_ID} className="overflow-hidden rounded-lg" />
        <p className="mt-3 text-center text-xs text-white/40">
          {continuo ? "Escanea uno tras otro -- se van agregando solos" : "Apunta la cámara al código de barras o QR"}
        </p>
        {statusText && <p className="mt-2 text-center text-sm font-semibold text-brand">{statusText}</p>}
      </div>
    </div>
  );
}
