"use client";

import { useEffect, useRef, useState } from "react";

// Dictado por voz para la descripción -- usa el reconocimiento de voz nativo del
// navegador (Web Speech API), sin ningún servicio externo ni costo. Funciona bien en
// Chrome/Edge y en Safari de iPhone; en navegadores sin soporte (ej. Firefox) el botón
// simplemente no aparece, en vez de tronar.
//
// `onTexto` se llama con el texto COMPLETO que debe llevar el campo (reemplaza, no
// agrega) -- así se puede ir mostrando en vivo conforme se habla: lo ya reconocido en
// firme, más lo que todavía se está afinando de la frase actual.
export default function DictadoBoton({ valorActual, onTexto }) {
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const recognitionRef = useRef(null);
  const onTextoRef = useRef(onTexto);
  const valorActualRef = useRef(valorActual);
  const baseRef = useRef(""); // texto que ya había en el campo al empezar a dictar
  const finalRef = useRef(""); // lo acumulado en firme durante esta sesión de dictado

  useEffect(() => {
    onTextoRef.current = onTexto;
  }, [onTexto]);
  useEffect(() => {
    valorActualRef.current = valorActual;
  }, [valorActual]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSoportado(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true; // sigue escuchando hasta que toquen "detener" -- para narrar algo largo
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += (finalRef.current ? " " : "") + transcript.trim();
        } else {
          interim += transcript;
        }
      }
      const sesion = `${finalRef.current}${interim ? (finalRef.current ? " " : "") + interim : ""}`;
      const completo = baseRef.current ? `${baseRef.current} ${sesion}`.trim() : sesion.trim();
      onTextoRef.current(completo);
    };
    recognition.onend = () => setEscuchando(false);
    recognition.onerror = () => setEscuchando(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const alternar = () => {
    if (!recognitionRef.current) return;
    if (escuchando) {
      recognitionRef.current.stop();
      setEscuchando(false);
    } else {
      baseRef.current = valorActualRef.current || "";
      finalRef.current = "";
      try {
        recognitionRef.current.start();
        setEscuchando(true);
      } catch {}
    }
  };

  if (!soportado) return null;

  return (
    <button
      type="button"
      onClick={alternar}
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        escuchando
          ? "border-red-500/50 bg-red-500/10 text-red-400"
          : "border-white/15 text-white/60 hover:border-brand hover:text-white"
      }`}
    >
      🎤 {escuchando ? "Escuchando... (toca para detener)" : "Dictar por voz"}
    </button>
  );
}
