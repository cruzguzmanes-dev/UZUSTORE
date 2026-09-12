import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// Documento independiente (recibo/cotización) -- no comparte look del catálogo a propósito.
// No se enlaza desde ningún lado del sitio, es un link directo para mandar al cliente.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata = {
  title: "Cotización — Hell Comics México",
  robots: { index: false, follow: false },
};

const css = `
  .cotizacion-doc {
    --paper: #e9e6dc;
    --paper-raised: #f6f4ec;
    --paper-recibo: #f1efe4;
    --ink: #211d22;
    --ink-soft: #5c564e;
    --ink-faint: #918a7c;
    --ember: #b23e19;
    --ember-soft: #c1401b1a;
    --line: #c7c0ae;
    --line-strong: #a89f8a;
    --shadow: 0 1px 2px rgba(33,29,34,.06), 0 12px 32px -16px rgba(33,29,34,.35);
  }
  @media (prefers-color-scheme: dark) {
    .cotizacion-doc {
      --paper: #161318;
      --paper-raised: #201c22;
      --paper-recibo: #1b171d;
      --ink: #ece7dd;
      --ink-soft: #a89f90;
      --ink-faint: #756c60;
      --ember: #e17242;
      --ember-soft: #e172421f;
      --line: #3a333a;
      --line-strong: #4c4450;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 20px 44px -20px rgba(0,0,0,.65);
    }
  }

  .cotizacion-doc * { box-sizing: border-box; }
  .cotizacion-doc {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif;
    padding: 40px 18px 64px;
    min-height: 100vh;
  }
  .cotizacion-doc .mono {
    font-family: var(--font-plex-mono), ui-monospace, "SF Mono", monospace;
    font-variant-numeric: tabular-nums;
  }
  .cotizacion-doc .sheet {
    max-width: 720px;
    margin: 0 auto;
    background: var(--paper-raised);
    border: 1px solid var(--line);
    border-radius: 4px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  /* ---- encabezado ---- */
  .cotizacion-doc .head {
    padding: 34px 40px 26px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    border-bottom: 1px solid var(--line);
  }
  .cotizacion-doc .issuer { font-size: 13px; color: var(--ink-soft); line-height: 1.6; }
  .cotizacion-doc .issuer strong { color: var(--ink); font-weight: 600; display: block; }
  .cotizacion-doc .folio { text-align: right; font-size: 12px; color: var(--ink-soft); line-height: 1.9; white-space: nowrap; }
  .cotizacion-doc .folio b { color: var(--ink); }

  .cotizacion-doc .titleblock { padding: 30px 40px 8px; position: relative; }
  .cotizacion-doc .eyebrow {
    font-family: var(--font-plex-mono), monospace;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ember);
    font-weight: 500;
  }
  .cotizacion-doc h1 {
    font-family: var(--font-fraunces), Georgia, serif;
    font-weight: 600;
    font-size: clamp(28px, 5vw, 38px);
    line-height: 1.08;
    margin: 8px 0 6px;
    text-wrap: balance;
    letter-spacing: -.01em;
  }
  .cotizacion-doc .subtitle {
    font-size: 15px;
    color: var(--ink-soft);
    max-width: 46ch;
    line-height: 1.5;
  }
  .cotizacion-doc .nota-personal {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
    max-width: 50ch;
    font-family: var(--font-fraunces), Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--ink-soft);
  }
  .cotizacion-doc .stamp {
    position: absolute;
    top: 30px;
    right: 40px;
    transform: rotate(6deg);
    border: 1.5px solid var(--ember);
    color: var(--ember);
    font-family: var(--font-plex-mono), monospace;
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    padding: 5px 11px;
    border-radius: 3px;
    font-weight: 600;
    opacity: .85;
  }

  /* ---- desglose ---- */
  .cotizacion-doc .desglose { padding: 22px 40px 8px; }
  .cotizacion-doc .section-label {
    font-family: var(--font-plex-mono), monospace;
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-bottom: 16px;
  }
  .cotizacion-doc .grupos {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 22px 28px;
    margin-bottom: 8px;
  }
  .cotizacion-doc .grupo h3 {
    font-family: var(--font-fraunces), Georgia, serif;
    font-weight: 600;
    font-size: 16px;
    margin: 0 0 8px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .cotizacion-doc .grupo h3 .n { font-family: var(--font-plex-mono), monospace; font-size: 12px; color: var(--ember); font-weight: 500; }
  .cotizacion-doc .grupo ul { margin: 0; padding: 0; list-style: none; }
  .cotizacion-doc .grupo li {
    font-size: 13.5px;
    color: var(--ink-soft);
    line-height: 1.55;
    padding-left: 14px;
    position: relative;
  }
  .cotizacion-doc .grupo li + li { margin-top: 3px; }
  .cotizacion-doc .grupo li::before {
    content: "–";
    position: absolute;
    left: 0;
    color: var(--ink-faint);
  }

  /* ---- perforación ---- */
  .cotizacion-doc .perforacion {
    position: relative;
    height: 0;
    margin: 30px 0 0;
    border-top: 1.5px dashed var(--line-strong);
  }
  .cotizacion-doc .perforacion::before, .cotizacion-doc .perforacion::after {
    content: "";
    position: absolute;
    top: -8px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--paper);
    border: 1px solid var(--line);
  }
  .cotizacion-doc .perforacion::before { left: -8px; }
  .cotizacion-doc .perforacion::after { right: -8px; }
  .cotizacion-doc .tab {
    position: absolute;
    top: -9px; left: 50%;
    transform: translateX(-50%);
    background: var(--paper-raised);
    padding: 0 10px;
    font-family: var(--font-plex-mono), monospace;
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  /* ---- recibo ---- */
  .cotizacion-doc .recibo { background: var(--paper-recibo); padding: 30px 40px 34px; }
  .cotizacion-doc .recibo .section-label { margin-bottom: 18px; }
  .cotizacion-doc table.partidas { width: 100%; border-collapse: collapse; }
  .cotizacion-doc table.partidas th {
    text-align: left;
    font-family: var(--font-plex-mono), monospace;
    font-size: 10.5px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-faint);
    font-weight: 500;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .cotizacion-doc table.partidas th:last-child, .cotizacion-doc table.partidas td.importe { text-align: right; }
  .cotizacion-doc table.partidas td { padding: 13px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .cotizacion-doc table.partidas td.concepto { font-weight: 600; font-size: 14.5px; }
  .cotizacion-doc table.partidas .detalle { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 400; color: var(--ink-soft); }
  .cotizacion-doc table.partidas td.importe { font-size: 14.5px; white-space: nowrap; padding-left: 16px; }
  .cotizacion-doc table.partidas td.importe .sub { display:block; font-size: 11px; color: var(--ink-faint); margin-top: 2px; }

  .cotizacion-doc .totales { margin-top: 4px; }
  .cotizacion-doc .totales .fila { display: flex; justify-content: space-between; padding: 9px 0; font-size: 13.5px; color: var(--ink-soft); }
  .cotizacion-doc .totales .fila.total {
    border-top: 1.5px solid var(--ink);
    margin-top: 4px;
    padding-top: 14px;
    font-size: 17px;
    font-weight: 600;
    color: var(--ink);
  }
  .cotizacion-doc .totales .fila.total .importe { font-family: var(--font-plex-mono), monospace; color: var(--ember); }
  .cotizacion-doc .letras {
    margin-top: 14px;
    font-size: 12.5px;
    font-style: italic;
    font-weight: 500;
    color: var(--ink-soft);
    font-family: var(--font-fraunces), Georgia, serif;
  }
  .cotizacion-doc .vigencia {
    margin-top: 18px;
    display: inline-block;
    font-family: var(--font-plex-mono), monospace;
    font-size: 11.5px;
    color: var(--ink-soft);
    background: var(--ember-soft);
    border: 1px solid var(--ember);
    padding: 5px 10px;
    border-radius: 3px;
  }
  .cotizacion-doc .licencia-notas {
    margin-top: 26px;
    padding-top: 20px;
    border-top: 1px dashed var(--line);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px 28px;
  }
  .cotizacion-doc .licencia-notas h4 {
    font-family: var(--font-plex-mono), monospace;
    font-size: 10.5px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin: 0 0 8px;
    font-weight: 500;
  }
  .cotizacion-doc .licencia-notas ul { margin: 0; padding: 0; list-style: none; }
  .cotizacion-doc .licencia-notas li {
    font-size: 12.5px;
    color: var(--ink-soft);
    line-height: 1.55;
    padding-left: 14px;
    position: relative;
  }
  .cotizacion-doc .licencia-notas li + li { margin-top: 5px; }
  .cotizacion-doc .licencia-notas li::before {
    content: "–";
    position: absolute;
    left: 0;
    color: var(--ink-faint);
  }
  .cotizacion-doc .alcance { margin-top: 24px; padding-top: 20px; border-top: 1px dashed var(--line); }
  .cotizacion-doc .alcance-titulo {
    font-family: var(--font-fraunces), Georgia, serif;
    font-weight: 600;
    font-size: 15px;
    margin: 0 0 8px;
  }
  .cotizacion-doc .alcance-intro { font-size: 12.5px; color: var(--ink-soft); line-height: 1.55; max-width: 56ch; margin: 0 0 18px; }
  .cotizacion-doc .licencia-notas h4.ok { color: var(--ink-soft); }
  .cotizacion-doc .licencia-notas .full { grid-column: 1 / -1; }
  .cotizacion-doc .licencia-notas h4.grande { color: var(--ember); }
  .cotizacion-doc .alcance .licencia-notas { margin-top: 0; padding-top: 0; border-top: none; }

  /* ---- pie ---- */
  .cotizacion-doc .pie { padding: 26px 40px 34px; }
  .cotizacion-doc .nota {
    margin-top: 26px;
    font-size: 11px;
    color: var(--ink-faint);
    line-height: 1.6;
    border-top: 1px solid var(--line);
    padding-top: 14px;
  }

  @media (max-width: 620px) {
    .cotizacion-doc .grupos, .cotizacion-doc .licencia-notas { grid-template-columns: 1fr; }
    .cotizacion-doc .head { flex-direction: column; }
    .cotizacion-doc .folio { text-align: left; }
    .cotizacion-doc .stamp { position: static; transform: none; display: inline-block; margin-top: 10px; }
    .cotizacion-doc .sheet { border-radius: 0; }
    .cotizacion-doc { padding: 0 0 40px; }
  }

  @media print {
    .cotizacion-doc { background: #fff; padding: 0; }
    .cotizacion-doc .sheet { box-shadow: none; border: none; max-width: 100%; }
  }
`;

export default function CotizacionPage() {
  return (
    <div className={`cotizacion-doc ${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <style>{css}</style>

      <div className="sheet">
        <div className="head">
          <div className="issuer">
            <strong>Eric Sebastián Cruz Guzmán</strong>
            Desarrollo de software
            <span>cruzguzmanes@gmail.com · 55 2058 4024</span>
          </div>
          <div className="folio">
            Folio <b className="mono">HC-2026-001</b>
            <br />
            Fecha <b className="mono">12 / 09 / 2026</b>
            <br />
            Cliente <b>Hell Comics México</b>
          </div>
        </div>

        <div className="titleblock">
          <span className="stamp">Cotización</span>
          <div className="eyebrow">Propuesta de sistema · desglose y recibo</div>
          <h1>
            Catálogo digital y panel de
            <br />
            administración para Hell Comics
          </h1>
          <p className="subtitle">
            Sistema a la medida: catálogo público, ventas, apartados y control de inventario, construido y mantenido
            de forma continua.
          </p>
          <p className="nota-personal">
            Gracias por confiar este proyecto desde cero — lo armamos juntos, probando y ajustando cada parte hasta
            dejarlo listo para tus clientes. Aquí está el desglose completo y los términos de la licencia.
          </p>
        </div>

        <div className="desglose">
          <div className="section-label">01 — Qué incluye el sistema</div>
          <div className="grupos">
            <div className="grupo">
              <h3>
                <span className="n">§1</span> Catálogo público
              </h3>
              <ul>
                <li>Búsqueda inteligente de productos</li>
                <li>Secciones en el home (novedades, destacados) que se manejan desde el panel de items</li>
                <li>Categorías y resultados con scroll infinito</li>
                <li>Ficha de producto: galería con zoom, tallas, video de reseña</li>
                <li>Botón "Me interesa" → WhatsApp con el mensaje ya escrito</li>
                <li>Si el producto está agotado, un botón para preguntar por él igual</li>
                <li>Si no encuentran algo, pueden preguntar directo desde la búsqueda</li>
                <li>Se instala como app en el celular, sin tienda de apps</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§2</span> Panel de administración
              </h3>
              <ul>
                <li>Alta y edición de productos: fotos, precio, costo privado, categoría</li>
                <li>Soporta código de barras</li>
                <li>Escaneo de código de barras con la cámara</li>
                <li>Si el artículo tiene tallas, también se soporta</li>
                <li>Productos "no públicos" para control interno sin publicarlos</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§3</span> Ventas
              </h3>
              <ul>
                <li>Venta rápida de un producto</li>
                <li>Ventas combinadas de varios productos, con descuento</li>
                <li>Soporte para registrar la venta por código de barras</li>
                <li>Historial</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§4</span> Apartados
              </h3>
              <ul>
                <li>Reserva de productos con nombre y teléfono del comprador</li>
                <li>Registro de abonos parciales y saldo pendiente</li>
                <li>Cancelación con reintegro automático al inventario</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§5</span> Estadísticas
              </h3>
              <ul>
                <li>Visitas por día, semana y mes</li>
                <li>Horas de mayor tráfico</li>
                <li>Productos más vistos</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§6</span> Seguridad
              </h3>
              <ul>
                <li>Acceso al panel protegido con contraseña cifrada</li>
                <li>Bloqueo automático tras intentos fallidos</li>
              </ul>
            </div>

            <div className="grupo">
              <h3>
                <span className="n">§7</span> Configuraciones
              </h3>
              <ul>
                <li>WhatsApp, redes sociales y dirección editables sin tocar código</li>
                <li>Cambio del código de acceso al panel</li>
                <li>Aquí se irán agregando más apartados con el tiempo</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="perforacion">
          <span className="tab">✂ corte</span>
        </div>

        <div className="recibo">
          <div className="section-label">02 — Recibo de licencia</div>

          <table className="partidas">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="concepto">
                  Licencia mensual del sistema
                  <span className="detalle">Uso del sistema, mantenimiento, soporte y actualizaciones</span>
                </td>
                <td className="importe mono">
                  $1,999.00
                  <span className="sub">/ mes</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="totales">
            <div className="fila total">
              <span>Total mensual</span>
              <span className="importe mono">$1,999.00 MXN</span>
            </div>
          </div>

          <p className="letras">Son: mil novecientos noventa y nueve pesos 00/100 M.N. mensuales.</p>

          <span className="vigencia mono">Sin compromiso forzoso — cancelas cuando quieras.</span>

          <div className="licencia-notas">
            <div>
              <h4>Sobre esta licencia</h4>
              <ul>
                <li>
                  Es una licencia de uso, no una venta del sistema — el código fuente no se entrega, se queda a
                  nombre del desarrollador.
                </li>
                <li>
                  El hosting (Vercel y Supabase) queda a tu nombre, para que veas con toda claridad qué se gasta y
                  en qué.
                </li>
                <li>El acceso al panel de administración depende de mantener el pago al corriente.</li>
              </ul>
            </div>
            <div>
              <h4>No incluye</h4>
              <ul>
                <li>Registro o renovación de dominio propio</li>
                <li>
                  Ancho de banda adicional en Vercel — es lo que te da las visitas del mes; si crecen mucho, ahí es
                  donde se sube de plan
                </li>
                <li>Almacenamiento adicional en Supabase — te cobra más conforme suban más productos y fotos</li>
              </ul>
            </div>
            <div className="full">
              <h4>Sí incluye</h4>
              <ul>
                <li>Ayuda a configurar tu dominio</li>
                <li>Ayuda a configurar planes de Supabase y Vercel, si hace falta</li>
              </ul>
            </div>
          </div>

          <div className="alcance">
            <h4 className="alcance-titulo">Alcance de las actualizaciones</h4>
            <p className="alcance-intro">
              Todo lo que platiquemos se va agregando a tu sistema, dentro de tu licencia — lo que cambia es el
              tiempo que toma según qué tan grande sea.
            </p>
            <div className="licencia-notas">
              <div>
                <h4 className="ok">Ajustes y mejoras rápidas</h4>
                <ul>
                  <li>Cualquier bug que salga, se corrige sin costo</li>
                  <li>Las mejoras que vayamos platicando juntos sobre la marcha</li>
                  <li>Actualizaciones de seguridad</li>
                  <li>Ajustes de diseño, textos o flujos ya existentes</li>
                </ul>
              </div>
              <div>
                <h4 className="grande">Funciones grandes y nuevas</h4>
                <ul>
                  <li>Ej. chatbot con IA que recomiende productos</li>
                  <li>Ej. e-commerce con pagos en línea (carrito, checkout)</li>
                  <li>Ej. cuentas de cliente con inicio de sesión</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="pie">
          <p className="nota">
            Este documento es una cotización informativa y no constituye una factura fiscal. Los montos están
            expresados en pesos mexicanos (MXN). Sujeta a confirmación por ambas partes antes de iniciar el periodo
            de vigencia.
          </p>
        </div>
      </div>
    </div>
  );
}
