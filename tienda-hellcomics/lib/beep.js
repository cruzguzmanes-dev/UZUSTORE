// Beep sintético (sin archivo de audio) para simular el sonido de un scanner de tienda
// al leer un código -- confirmación auditiva rápida al escanear varios seguidos.
export function reproducirBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1568; // agudo, tipo "beep" de scanner de caja
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    osc.onended = () => ctx.close();
  } catch {
    // Si el navegador bloquea audio o no soporta Web Audio, no pasa nada grave -- se
    // pierde el sonido, no la función.
  }
}
