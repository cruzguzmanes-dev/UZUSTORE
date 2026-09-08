"use client";

import { useEffect, useRef, useState } from "react";
import { reproducirBeep } from "@/lib/beep";

const ELEMENT_ID = "barcode-scanner-region";
const COOLDOWN_MS = 1200; // en modo continuo, evita que el mismo código dispare varias veces mientras sigue frente a la cámara

// Modal con la cámara abierta, leyendo QR y los formatos de barras que traen los
// productos de fábrica (EAN/UPC) además de Code128/39 por si imprimen sus propias
// etiquetas. Todo corre en el navegador -- no manda nada a ningún servicio externo.
//
// continuo=false (default, para el form de item/tallas): al detectar un código, suena un
// beep, se aplica de inmediato (onScan) y se muestra una confirmación con "Listo" (cierra)
// o "Escanear otro" (sigue) -- así queda claro que sí lo detectó, en vez de cerrarse solo
// sin avisar.
// continuo=true (para "Nueva venta"/apartados): sigue leyendo una tras otra con un
// cooldown, sin pedir confirmación -- el padre decide cuándo cerrar.
export default function BarcodeScanner({ onScan, onClose, continuo = false, statusText }) {
  const scannerRef = useRef(null);
  const bloqueadoRef = useRef(false); // modo single-shot
  const enCooldownRef = useRef(false); // modo continuo
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");
  const [pendiente, setPendiente] = useState(""); // último código detectado en modo single-shot, para la confirmación

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
              reproducirBeep();
              onScanRef.current(decodedText);
              setTimeout(() => {
                enCooldownRef.current = false;
              }, COOLDOWN_MS);
            } else {
              if (bloqueadoRef.current) return; // ya hay uno esperando confirmación, ignora más lecturas
              bloqueadoRef.current = true;
              reproducirBeep();
              onScanRef.current(decodedText);
              setPendiente(decodedText);
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

  const escanearOtro = () => {
    setPendiente("");
    bloqueadoRef.current = false;
  };

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

        {!continuo && pendiente ? (
          <div className="mt-3 rounded-lg border border-brand/30 bg-brand/10 p-3 text-center">
            <p className="mb-2 text-sm text-brand">✓ Código detectado: {pendiente}</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
              >
                Listo
              </button>
              <button
                type="button"
                onClick={escanearOtro}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Escanear otro
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-white/40">
            {continuo ? "Escanea uno tras otro -- se van agregando solos" : "Apunta la cámara al código de barras o QR"}
          </p>
        )}
        {statusText && <p className="mt-2 text-center text-sm font-semibold text-brand">{statusText}</p>}
      </div>
    </div>
  );
}
