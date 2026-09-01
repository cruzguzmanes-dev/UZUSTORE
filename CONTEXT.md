# UZUSTORE — Contexto del Proyecto

> ⚠️ **PENDIENTE DE SEGURIDAD (diferido a propósito):** RLS está desactivado en todas las tablas y la `SUPABASE_KEY` pública viaja en el bundle del frontend → cualquiera puede leer/escribir/borrar toda la BD directo por la API REST, sin login. Los "códigos de acceso" solo protegen el frontend, no la BD. Aceptado como riesgo temporal para las primeras entregas. A atacar cuando haya tiempo: activar RLS con políticas + mover escrituras a las funciones serverless con una **service key** secreta (no la pública).

## ¿Qué es?

Dashboard fiscal y de gestión para un vendedor de figuras de anime/coleccionables en MercadoLibre México. El dueño también tiene distribuidores externos (revendedores) que manejan su propio inventario físico.

El proyecto tiene **dos partes diferenciadas**:

1. **Panel del dueño** (`/`) — Dashboard privado con login OAuth de MercadoLibre
2. **Portal de distribuidores** (`/distribuidor/:slug`) — App independiente por proveedor, con su propio sistema de acceso por código

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite |
| Backend | Serverless functions en Vercel (`/api/`) |
| Base de datos | Supabase (PostgreSQL via REST) |
| Deploy | Vercel |
| Fonts | Syne (títulos) + Space Mono (datos) |
| Moneda | MXN — formateada con `fmt()` de `Intl.NumberFormat` |

No hay router (React Router). La detección de rutas se hace en `App.jsx` con `window.location.pathname`.

---

## Estructura de archivos relevante

```
/
├── api/
│   ├── ml.js                      # Proxy para la API de MercadoLibre
│   ├── token.js                   # OAuth ML (intercambio de código por token)
│   └── distribuidor/
│       ├── auth.js                # Login por código; retorna role + modo_precio
│       ├── inventario.js          # CRUD inventario_distribuidor
│       ├── historial.js           # GET ventas por item (ventas_distribuidor)
│       ├── pagos.js               # GET + POST pagos_distribuidor
│       └── settings.js            # GET + PATCH configuración (modo_precio)
│
├── src/
│   ├── App.jsx                    # Entry point; detecta /distribuidor/:slug
│   ├── utils.js                   # fmt(), sb(), calcFIFO()
│   ├── constants.js               # SUPABASE_URL, SUPABASE_KEY, GS (global styles)
│   │
│   ├── tabs/                      # Tabs del panel del dueño
│   │   ├── Resumen.jsx
│   │   ├── Mensual.jsx
│   │   ├── Inventario.jsx
│   │   ├── Almacen.jsx           # Tab "Almacén" — compras ZenMarket (Figuras/Compras/Paquetes/Pagos)
│   │   ├── Impuestos.jsx
│   │   ├── Ordenes.jsx
│   │   └── Distribuidores.jsx     # Panel admin de distribuidores (para el dueño)
│   │
│   └── pages/distribuidor/        # Portal del distribuidor (URL pública)
│       ├── DistribuidorDashboard.jsx
│       ├── DistribuidorLogin.jsx
│       ├── InventarioTable.jsx
│       └── UploadForm.jsx
```

---

## Panel del dueño (`/`)

Login con MercadoLibre OAuth. Una vez conectado:

- **Resumen** — KPIs globales: ventas, neto ML, costos FIFO, ganancia, ISR
- **Mensual** — desglose mes a mes con enrichment bajo demanda
- **Inventario** — tabla de lotes comprados con costo unitario y SKU (stock real, ya vendible, con FIFO)
- **Almacén** — todo el proceso de compra en ZenMarket (Japón) ANTES de tener un ID de venta; ver sección propia abajo
- **Impuestos** — retenciones IVA/ISR calculadas sobre base gravable
- **Órdenes** — tabla completa con FIFO aplicado
- **Distribuidores** — gestión de proveedores externos (ver sección abajo)

### Lotes (inventario del dueño)
Tabla `lotes` en Supabase. Campos clave: `titulo`, `sku`, `cantidad_disponible`, `cantidad_inicial`, `costo_unitario`, `fecha_compra`. Se usa FIFO para calcular costo de cada venta (se consume por orden de `fecha_compra`/`created_at`).

Se alimenta de **dos fuentes**:
1. **Manual directo** — botón "+ Agregar Lote" (`src/components/ModalLote.jsx`), costo ya en MXN. Es la ruta que usan las compras con **distribuidores locales** (pago directo en pesos, sin ¥, sin aduana) — nunca pasan por Almacén.
2. **Automático desde Almacén** — cuando una figura de ZenMarket ya tiene costo resuelto en MXN y un ID de venta asignado, ver abajo.

### Almacén (compras ZenMarket)

Archivo: `src/tabs/Almacen.jsx` (tab "Almacén"). Cubre todo el proceso de comprar figuras en Japón vía **ZenMarket** (proxy de compra) desde que se adquieren hasta que están listas para pasar a Inventario. ZenMarket da una línea de crédito de ¥500,000 — el dueño acumula 10-15 compras antes de liquidar, así que el costo en MXN de cada compra **no se sabe hasta que se paga el crédito** (tipo de cambio real de ese pago).

4 sub-tabs, en orden de flujo:

1. **Figuras** (`figuras`) — catálogo de productos. `id_provisional` se autogenera (`FIG-001`, ...) al crear. Tiene **dos IDs opcionales, independientes, editables inline**:
   - `ml_sku` — SKU/ID real de MercadoLibre, cuando se publica ahí.
   - `id_venta_directa` — ID interno de texto libre para piezas que se mandan directo a punto de venta/distribuidor **sin publicarse en ML** (migración `011-figuras-id-venta-directa.sql`). Por ahora es solo un campo de texto, **sin integración** con `inventario_distribuidor` — pendiente de definir del lado del negocio.
   - Una figura se considera "publicable" (lista para pasar a Inventario) cuando tiene `ml_sku` **o** `id_venta_directa` — cualquiera de los dos sirve.
2. **Compras** (`lotes_compra`) — una fila por compra hecha en ZenMarket: `figura_id`, `cantidad`, `precio_jpy` (**costo TOTAL de la compra, no por pieza** — al generar el lote se divide entre `cantidad` para sacar el costo unitario), `fecha_compra`, `estado` (`pendiente → pagado → en_transito → recibido`). `precio_mxn` (también total, no por pieza) queda `null` hasta que se le asigna un pago (ver punto 4). `lote_generado_id` es el campo que marca que **esta compra específica** ya se convirtió en una fila de `lotes` (Inventario) — es la unidad de tracking por artículo individual.
3. **Paquetes** (`paquetes` + `paquete_items`) — cuando hay varias compras acumuladas, ZenMarket las empaqueta para envío; un paquete puede agrupar 1 o varias compras (`paquete_items`, con su propia `cantidad`, que puede ser parcial respecto a la compra original). El formulario de creación ya no pide "nombre" (la columna se conserva NOT NULL pero se auto-llena con `id_zenmarket` — el ID de ZenMarket es el único identificador real, se ingresa como número y es obligatorio) — en su lugar, ahí mismo se seleccionan las publicaciones compradas que van en el paquete (una lista con selector + cantidad, antes de crear; al elegir una compra la cantidad se precarga con el total disponible, editable). Campos: `id_zenmarket`, `costo_envio_jpy` (una vez `estado='pagado'` se muestra también su equivalente en MXN, calculado con el tipo de cambio del pago asignado), `costo_aduana_mxn` (el campo **solo se habilita cuando el paquete ya está `pagado`** — antes de eso no tiene caso capturarlo; se llena cuando llega y se paga aduana en México, ese momento **es** la señal de que llegó, se guarda `fecha_llegada` automático), `dimensiones` (texto libre, ej. "72cm × 27cm × 31cm - 6950g" — tal cual como lo entrega ZenMarket, migración `012-paquetes-peso-dimensiones.sql`), `estado` (solo `armando` / `pagado`, migración `013-paquetes-saldar-flujo.sql` — ya no se distingue en_transito/en_aduana/recibido), `pago_zenmarket_id` (a qué pago de crédito quedó ligado), `envio_agregado_a_saldar` (ver Pagos abajo). Se pueden seguir agregando compras a un paquete después de creado (mientras siga `armando`), vía el mismo selector dentro de la vista expandida.
4. **Pagos ZenMarket** (`pagos_zenmarket`) — el crédito de ZenMarket (¥500,000) solo cubre **compras**; el envío se paga aparte, con puntos ya depositados (no se puede pagar envío con crédito). Por eso el flujo de "Saldar" separa las dos cosas:
   - **"Por saldar"** (banner al inicio del sub-tab Pagos) = suma de **todas** las compras sin `precio_mxn` (deuda de crédito, se acumula sola y siempre se liquida completa) **+** el `costo_envio_jpy` de los paquetes que se hayan marcado manualmente para esta liquidación.
   - Junto a cada paquete `armando` sin pago hay un botón **"+ Agregar a saldar"** (habilitado solo si ya tiene `costo_envio_jpy` capturado) que prende `envio_agregado_a_saldar` — así decides qué paquetes liberas para envío en esta ronda y cuáles se quedan esperando (almacenaje gratis 60 días en ZenMarket).
   - El botón **"💰 Saldar →"** solo pide fecha + MXN pagados (los ¥ ya se calculan solos del banner) → registra el pago, calcula el tipo de cambio, pone `precio_mxn` a **todas** las compras pendientes, y marca `estado='pagado'` + `pago_zenmarket_id` **solo** en los paquetes que se agregaron al saldo (los demás se quedan `armando`, listos para una liquidación futura).

**Paso a Inventario — por artículo individual, no por paquete.** Un paquete puede traer varias figuras que se publican en momentos distintos (una ya tiene ID de ML, otra sigue esperando). Por cada artículo (`paquete_items` → `lotes_compra`) dentro de un paquete con costo ya resuelto (`estado='pagado'` + `pago_zenmarket_id` asignado + `costo_aduana_mxn` capturado — variable `costReady` en el código), se muestra:
Cuando el paquete ya está listo (`costReady`), la vista expandida muestra una **"Vista previa de costos"** con el costo final por pieza de cada artículo (compra ÷ su cantidad + envío ÷ piezas del paquete + aduana ÷ piezas del paquete, con el tipo de cambio del pago asignado) — el mismo cálculo que usará "Generar Lote →" al crear el lote real, para verlo antes de generar.

- **"Generar Lote →"** si la figura ya tiene `ml_sku` o `id_venta_directa` — al hacer click (`handleGenerarLoteItem`) crea SOLO el lote de ese artículo en `lotes`, usando ese ID como `sku` (nunca `id_provisional` — no se permite que inventario real quede con un ID interno de placeholder). El envío y la aduana del paquete se prorratean entre **todas** las piezas del paquete (generadas o no), no solo las ya publicadas.
- **"Falta ID (ML o venta directa)"** si aún no tiene ninguno de los dos IDs — se queda esperando en Almacén sin bloquear a los demás artículos del mismo paquete.

El paquete solo se marca `lotes_generados = true` (badge "✓ LOTES OK") cuando **todos** sus artículos ya brincaron a Inventario.

### Cálculo fiscal MercadoLibre México
```
base_gravable = total_amount / 1.16
IVA retenido por ML = base × 8%
ISR retenido por ML = base × 2.5%
IVA pendiente SAT   = base × 8%  (hay que pagarlo)
neto_real = total_amount - sale_fee - envío - IVA_retenido - ISR_retenido
```

---

## Portal de Distribuidores

### URLs
- Panel del dueño: `/` → tab "Distribuidores" en `src/tabs/Distribuidores.jsx`
- Portal del proveedor: `/distribuidor/gaticueva` o `/distribuidor/friki`

### Distribuidores actuales
| slug | Nombre | Color |
|------|--------|-------|
| `gaticueva` | Gaticueva | `#00C9FF` |
| `friki` | Friki | `#FF6B9D` |
| `practica` | Práctica | `#00FF94` | (tienda de **prueba** para que los puntos de venta ensayen; id 4)

El panel del dueño (`Distribuidores.jsx`) ya es **dinámico**: define `SLUGS`/`NOMBRES`/`COLORS` y todo (estado, `fetchAll`, tabs, resumen) se genera con `SLUGS.map(...)`. Para agregar otra tienda: crear la fila en `distribuidores` (Supabase) y agregar el slug a esas 3 constantes.

---

## Modelo de 3 precios

Cada artículo del inventario tiene (opcionalmente) 3 precios:

| Campo | Quién lo define | Descripción |
|-------|----------------|-------------|
| `costo_unitario` | Dueño (de tabla `lotes`) | Lo que le costó al dueño comprar la pieza |
| `precio_mayoreo` | Dueño (en su panel) | Lo que le cobra al distribuidor por unidad |
| `precio_venta` | Distribuidor (opcional) | Lo que el distribuidor cobra a sus clientes |

### Ganancias calculadas
- **Ganancia del dueño** = `precio_mayoreo − costo_unitario` (visible en panel admin, cuando item tiene lote vinculado)
- **Ganancia del distribuidor** = `precio_venta − precio_mayoreo` (visible en su dashboard, solo rol `admin`, si tienen `precio_venta`)
- **Saldo al proveedor** = `precio_mayoreo × vendidas − pagos_registrados` (visible para el dueño y para el distribuidor de cualquier rol)

---

## Sistema de roles en el portal del distribuidor

Cada distribuidor en la tabla `distribuidores` tiene dos códigos:

| Campo | Rol | Acceso |
|-------|-----|--------|
| `acceso_code` | `basic` (**Vendedor**) | Editar nombre y su precio de venta, marcar vendidos, **ver saldo y solicitar pagos**, ver historiales, proponer inventario, registrar venta suelta. NO agrega inventario con precio, ni toca el costo distribuidor, ni hace restock. En el header **no ve badge** (solo el PRO muestra "PRO"). |
| `acceso_admin` | `admin` (PRO) | Todo lo anterior + **agregar inventario** (con precio de mayoreo) + **editar el mayoreo** de artículos + **aceptar/rechazar pagos** |

Los historiales de **ventas** ("📋 Ventas") y de **pagos** ("🧾 Pagos") son botones arriba visibles para **ambos** roles.

El header del portal muestra el badge **"PRO"** junto a "Gestiona tu inventario" solo cuando se entró con el código admin. El **Vendedor** (código básico) no ve ningún badge. Además, su formulario "📸 Inventariar pieza pasada" arranca **colapsado**.

> **Ningún rol puede eliminar artículos.** Borrar es exclusivo del dueño desde su panel admin. El saldo pendiente y el flujo de pago (total/parcial) son visibles para **ambos** roles.

Los códigos actuales:
- Práctica (prueba): básico `PRACTICA`, admin `PRACTICAPRO`
- Gaticueva: básico `GATI2026`, admin `GATI2026PRO`
- Friki: básico `FRIKI2026`, admin `FRIKI2026PRO`

El role y la sesión se guardan en `localStorage` con expiración de 30 días:
- `dist_session_${slug}` → código ingresado
- `dist_session_exp_${slug}` → timestamp de expiración
- `dist_role_${slug}` → `"admin"` | `"basic"`

---

## Modo de inventario (`modo_precio`)

Switch configurable por el dueño en su panel (tab Distribuidores), guardado en `distribuidores.modo_precio`:

| Valor | Descripción | Efecto en el portal del distribuidor |
|-------|-------------|--------------------------------------|
| `"venta"` (default) | El distribuidor registra su propio precio de venta | Campo `precio_venta` visible en formulario de subida y edición |
| `"mayoreo"` | El distribuidor no revela su precio de venta | Campo `precio_venta` oculto; solo se usa `precio_mayoreo` para el corte |

**Caso real:** Friki prefiere no revelar su precio de venta → se configura en modo `mayoreo`. Su corte solo muestra "Saldo al proveedor" sin mostrar ganancia neta.

---

## Tablas en Supabase

Todas tienen `DISABLE ROW LEVEL SECURITY`.

### `distribuidores`
```sql
id            SERIAL PRIMARY KEY
nombre        TEXT
slug          TEXT UNIQUE
acceso_code   TEXT        -- código básico
acceso_admin  TEXT        -- código admin
modo_precio   TEXT DEFAULT 'venta'  -- 'venta' | 'mayoreo'
```

### `inventario_distribuidor`
```sql
id              SERIAL PRIMARY KEY
distribuidor_id INTEGER REFERENCES distribuidores(id)
nombre          TEXT
foto_url        TEXT        -- base64 JPEG comprimido (max 400px, quality 0.65)
precio_venta    DECIMAL(10,2)  -- opcional; precio del distribuidor
precio_mayoreo  DECIMAL(10,2)  -- precio que cobra el dueño al distribuidor
cantidad        INT DEFAULT 1   -- stock actual
vendidas        INT DEFAULT 0
lote_sku        TEXT            -- SKU del lote vinculado (tabla lotes)
estado          TEXT DEFAULT 'activo'  -- 'activo' | 'pendiente' (propuesto por el normal) | 'rechazada'
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**Inventario propuesto por el normal** (migración `008-inventario-estado.sql`): el NORMAL puede **"📸 Inventariar pieza pasada"** (foto + nombre + cantidad, sin precio) → crea la fila con `estado='pendiente'`. El PRO la ve en **"📦 Inventario por aprobar (N)"** (arriba), le pone el **costo distribuidor** y la aprueba (`PUT estado='activo' + precio_mayoreo`) → pasa a inventario real (aparece en "Artículos"). Rechazar = `PUT estado='rechazada'` (se guarda, no se borra; se decide después qué hacer con ellas). Los items `pendiente`/`rechazada` no cuentan en stock/saldo/vendidas ni se muestran en la lista principal (ni en el panel del dueño); el normal ve los `pendiente` suyos en "⏳ En proceso" (texto gentil, sin mencionar "aprobación"; el botón de envío dice solo "Enviar"). El selector de foto de `UploadForm` ofrece dos botones (📷 Cámara con `capture="environment"` + 🖼️ Galería) para que funcione en Android e iOS.

### `ventas_distribuidor`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
item_id         INTEGER REFERENCES inventario_distribuidor(id) ON DELETE CASCADE
distribuidor_id INTEGER REFERENCES distribuidores(id)
cantidad        INT DEFAULT 1
precio_venta    DECIMAL(10,2)
created_at      TIMESTAMPTZ DEFAULT NOW()
```
Se inserta automáticamente cada vez que se marca un artículo como "Vendido" (vía `log_venta` en el PUT de inventario).

### `pagos_distribuidor`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
distribuidor_id INTEGER REFERENCES distribuidores(id)
monto           DECIMAL(10,2) NOT NULL   -- total recibido en ese pago
tipo            TEXT CHECK (tipo IN ('parcial', 'completo'))
notas           TEXT
monto_deuda     DECIMAL(10,2) DEFAULT 0  -- parte del pago que fue saldación de deuda vieja (no cuenta a ventas)
created_at      TIMESTAMPTZ DEFAULT NOW()
```
Append-only. **Saldo de ventas** = `Σ(precio_mayoreo × vendidas) − Σ(monto − monto_deuda)`. **Abonado a deuda** = `Σ(monto_deuda)`. Un pago entra aquí de dos formas: registrado directo por el dueño, o al **aceptar** una `solicitudes_pago`.

**Saldación de deuda vieja** (migración `009-abono-deuda.sql`): si un pago supera el saldo de ventas, al **aceptar** (en el admin del dueño o el portal PRO) se abre un split donde el dueño confirma cuánto del excedente es saldación de deuda (default = excedente). Esa parte se guarda en `monto_deuda` y **nunca se re-acredita a ventas futuras** (evita que un sobrepago le baje su próximo saldo). Se muestra "Abonado a deuda" en el corte del admin y en la card de saldo del portal. Pendiente futuro: guardar el **total** de la deuda vieja para ver "resta $Z".

**Sobrepago sin marcarlo como deuda vieja = crédito implícito.** No existe un campo/tabla de "saldo a favor" — es deliberado (ver arriba). Pero si al aceptar el split el dueño deja el excedente en $0 (en vez del default), ese dinero entra 100% a `pagadoVentas`, y como `saldo = teDeben − pagadoVentas` se recalcula en vivo, el saldo puede quedar **negativo** — que en la práctica actúa como crédito silencioso hasta que se consume con ventas futuras. Ambas pantallas (`Distribuidores.jsx` panel dueño, `DistribuidorDashboard.jsx` card de saldo del portal) ya muestran el monto real "X a favor" cuando `saldo < 0` en vez de solo "✓ Al corriente" (antes el portal lo redondeaba a $0.00 con `Math.max(0, saldo)`, escondiendo el crédito). **Excepción sin cubrir:** el pago **directo** que registra el dueño (botones 💸/💰 en su panel, sin pasar por una solicitud del distribuidor) no tiene split — el 100% siempre va a `pagadoVentas`, así que un sobrepago por esa vía se vuelve crédito automático sin que el dueño pueda elegir mandarlo a deuda.

### `solicitudes_pago`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
distribuidor_id INTEGER REFERENCES distribuidores(id)
monto           DECIMAL(10,2) NOT NULL
tipo            TEXT CHECK (tipo IN ('parcial', 'completo'))
estado          TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado'))
notas           TEXT
pago_id         UUID          -- id del pago creado en pagos_distribuidor al aceptar
es_abono        BOOLEAN DEFAULT false  -- true = abono directo a deuda (no de ventas)
created_at      TIMESTAMPTZ DEFAULT NOW()
resolved_at     TIMESTAMPTZ   -- cuándo se aceptó/rechazó
```
Flujo de pagos en 2 fases: el distribuidor crea la solicitud (`pendiente`); el dueño o el PRO la acepta (inserta pago real + marca `aceptado`) o la rechaza. Migración: `migrations/006-solicitudes-pago.sql`.

**Botón "🏦 Abonar a deuda"** (migración `010-solicitud-abono.sql`): en el portal del distribuidor, siempre visible. Crea una solicitud con `es_abono=true` (dinero que NO viene de ventas). Al aceptarla (dueño/PRO), se omite el split y el pago se crea con `monto_deuda = monto` (todo a deuda vieja, no toca el saldo de ventas). En "Pagos por aceptar" y "Mis pagos" se marca con badge "🏦 abono a deuda".

### `ventas_sueltas`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
distribuidor_id INTEGER REFERENCES distribuidores(id)
nombre          TEXT NOT NULL
cantidad        INT NOT NULL DEFAULT 1
precio_mayoreo  DECIMAL(10,2)   -- lo pone el PRO al confirmar
estado          TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','rechazada'))
created_at      TIMESTAMPTZ DEFAULT NOW()
confirmed_at    TIMESTAMPTZ
```
Ventas de piezas **no inventariadas** (stock viejo que el dueño dejó). El NORMAL registra **solo el nombre** → queda `pendiente`. El PRO ve la sección **"🧾 Ventas por confirmar (N)"** (aviso in-app), le pone el **precio de mayoreo** y la `confirma` → suma a `totalDebo`/saldo (y al conteo de vendidas y al historial "📋 Ventas" con badge "sin inv."). Solo el PRO confirma. El saldo del panel del dueño también incluye estas ventas confirmadas. Endpoints en `historial.js`. Migración: `migrations/007-ventas-sueltas.sql`.

### `lotes`
```sql
id                  SERIAL PRIMARY KEY
titulo              TEXT
sku                 TEXT
cantidad_disponible INT
costo_unitario      DECIMAL(10,2)
fecha_compra        DATE
created_at          TIMESTAMPTZ
```

---

## API Endpoints

### `/api/distribuidor/auth`
- `GET ?slug=X` → info básica del distribuidor (sin código)
- `GET ?slug=X&code=Y` → autentica; devuelve `{ distribuidor_id, nombre, slug, role, modo_precio }`

### `/api/distribuidor/inventario`
- `GET ?distribuidor=slug` → lista inventario completo del distribuidor
- `GET ?id=X` → obtiene un artículo específico
- `POST { distribuidor, nombre?, foto_url?, precio_venta?, precio_mayoreo?, cantidad, estado? }` → crea artículo (el dueño/PRO usa `precio_mayoreo`; el normal al proponer inventario manda `estado:'pendiente'` sin precio)
- `PUT ?id=X { cantidad?, vendidas?, precio_mayoreo?, nombre?, precio_venta?, lote_sku?, foto_url?, log_venta? }` → actualiza; si `log_venta` presente, inserta en `ventas_distribuidor`
- `DELETE ?id=X` → elimina artículo (solo se invoca desde el panel del dueño; el portal del distribuidor ya no expone borrado)

### `/api/distribuidor/historial` (dominio "ventas")
- `GET ?item_id=X` → historial de ventas de un artículo (`ventas_distribuidor`)
- `GET ?distribuidor=slug` → historial de ventas inventariadas del distribuidor
- `GET ?sueltas=slug [&estado=X]` → ventas sueltas (piezas no inventariadas)
- `POST { slug, nombre, cantidad? }` → el NORMAL registra una venta suelta (`estado='pendiente'`)
- `PATCH ?id=X { estado: 'confirmada'|'rechazada', precio_mayoreo? }` → el PRO confirma (con mayoreo, suma al saldo) o rechaza

### `/api/distribuidor/pagos`
- `GET ?slug=X` → historial de pagos (solo aceptados) del distribuidor
- `POST { slug, monto, tipo, notas? }` → registra un pago directo (lo usa el dueño)

### `/api/distribuidor/solicitudes`
- `GET ?slug=X [&estado=pendiente]` → lista solicitudes de pago del distribuidor
- `POST { slug, monto, tipo, notas? }` → el distribuidor crea una solicitud (`estado='pendiente'`)
- `PATCH ?id=X { estado: 'aceptado'|'rechazado' }` → el dueño/PRO resuelve; al aceptar inserta el pago en `pagos_distribuidor` y enlaza `pago_id`

### `/api/distribuidor/settings`
- `GET ?slug=X` → lee `modo_precio` del distribuidor
- `PATCH { slug, modo_precio }` → actualiza `modo_precio` (optimistic update en UI)

---

## Panel del dueño — Tab Distribuidores

Archivo: `src/tabs/Distribuidores.jsx`

**Lo que muestra:**
- Banner superior con saldo pendiente por distribuidor + total global
- Tabs por distribuidor (Gaticueva / Friki)
- **Botón flotante `+`** (abajo a la derecha, mobile-first) → alta rápida de artículo al distribuidor del tab activo (foto con cámara, nombre, precio de mayoreo, unidades). Botones "Guardar y agregar otro" / "Guardar y cerrar".
- Por distribuidor:
  - Toggle "Modo de inventario" (Su precio ↔ Mi precio)
  - Corte: stock, vendidas, sus ventas, total a cobrar, ya pagado
  - Saldo pendiente + botones "💸 Pago parcial" / "💰 Pago completo" (se ocultan cuando saldo ≤ 0)
  - Botón "🧾 Ver pagos" con historial completo (incluye los pagos que registra el propio distribuidor)
  - Lista de artículos con:
    - Precio del distribuidor (o badge "Precio privado" si no tiene)
    - Mayoreo editable inline + lote picker (vincula a tabla `lotes`, auto-rellena precio)
    - SKU del lote vinculado
    - "Te debe / Su gan. / Mi gan." cuando aplica
    - **Cambiar foto** (clic en la imagen → cámara/galería, se comprime y guarda vía `PUT foto_url`) — exclusivo del dueño
    - **Eliminar** artículo (botón 🗑 con confirmación inline) — exclusivo del dueño

---

## Portal del distribuidor (`/distribuidor/:slug`)

Archivos: `src/pages/distribuidor/`

**Flujo:**
1. `DistribuidorLogin.jsx` — pantalla de código de acceso
2. `DistribuidorDashboard.jsx` — carga inventario, pagos y datos del distribuidor; incluye card de saldo, flujo de pago y buscador. El inventario se separa en **"Artículos"** (cantidad > 0) y **"Artículos sin stock"** (cantidad ≤ 0, sección colapsable = historial de agotados) para que la vista principal quede limpia
3. `UploadForm.jsx` — formulario para agregar artículos. **Solo visible para PRO** (`{isAdmin && <UploadForm asOwner />}`); captura precio de mayoreo.
4. `InventarioTable.jsx` — grid de artículos con acciones (editar nombre/precio, vendido, restock; **sin eliminar, sin historial por celda**)

**Comportamiento por rol:**

| Feature | basic | admin |
|---------|-------|-------|
| Ver inventario | ✅ | ✅ |
| Buscar artículo por nombre | ✅ | ✅ |
| **Agregar artículos** (formulario de alta) | ❌ | ✅ |
| Editar nombre y su precio de venta (⚙) | ✅ | ✅ |
| Editar el **precio de mayoreo** de un artículo (⚙) | ❌ | ✅ |
| Marcar vendido | ✅ | ✅ |
| Restock (+ Stock) | ❌ | ✅ |
| Toggle "ver mi precio de venta" (localStorage) | oculto* | — |
| **Eliminar artículos** | ❌ | ❌ |
| Ver saldo al proveedor + **solicitar** pago (total/parcial) | ✅ | ✅ |
| Subir inventario con **precio de mayoreo** (como el dueño) | ❌ | ✅ |
| **Aceptar/rechazar** solicitudes de pago | ❌ | ✅ |
| Registrar **venta suelta** (pieza sin inventario, solo nombre) | ✅ | ❌ |
| **Confirmar ventas sueltas** (ponerles el mayoreo) | ❌ | ✅ |
| **Inventariar pieza pasada** (foto + nombre + cantidad → a aprobación) | ✅ | ❌ |
| **Aprobar inventario propuesto** (ponerle el mayoreo) | ❌ | ✅ |

\* El toggle "ver mi precio de venta" está **oculto por ahora** (`false && !isAdmin` en `DistribuidorDashboard.jsx`) para que el vendedor se enfoque en cuánto debe; se pasa `verVenta={isAdmin}` a `InventarioTable` (el vendedor ve el **costo distribuidor** en grande, sin su precio de venta). Reactivar cambiando `false &&` por `!isAdmin &&`.

Para el **PRO**, las solicitudes entrantes ("🧾 Ventas por confirmar" y "💳 Pagos por aceptar") se muestran **hasta arriba de todo** (después del header, antes de las stats), para que las vea al abrir.
| Ver "💳 Pagos por aceptar" (aceptar/rechazar solicitudes) | ❌ | ✅ |
| Ver el `precio_mayoreo` en la tarjeta (solo lectura, en chico junto al precio de venta) | ✅ | ✅ |
| **Editar** el `precio_mayoreo` | ❌ | ✅ |
| Ver historial de ventas y de pagos (botones "📋 Ventas" / "🧾 Pagos" arriba, no por celda) | ✅ | ✅ |
| **Eliminar** una venta del historial (error de captura) | ❌ | ✅ |
| Ver ganancia acumulada por artículo | ❌ | ✅ (si tiene precio_venta) |

El PRO ve el formulario de alta con precio (`asOwner`, captura **costo distribuidor** = `precio_mayoreo`). El normal no agrega inventario con precio, pero sí puede **proponerlo** (`UploadForm proposal`, foto+nombre+cantidad → pendiente). En la UI, `precio_mayoreo` se muestra como **"Costo distribuidor"**.

**Toggle "ver mi precio de venta" (solo NORMAL, `localStorage` key `dist_ver_venta_${slug}`, default ON)** — controla solo la vista del normal, sin tocar el `modo_precio` del dueño:
- **ON**: precio de venta en grande + "costo dist." en chico + campo de venta editable (tarjeta actual).
- **OFF**: solo el **costo distribuidor** en grande, sin precio de venta (ni campo de venta en el ⚙).
Para el PRO siempre es ON. El normal ya **no** ve "+ Stock" (solo "✓ Vendido"); el restock es solo del PRO.

**Card de saldo (todos los roles, es lo primero al entrar):** Normal ve **"Le debes al proveedor"** (con botón Pagar); PRO ve **"Te deben actualmente"** (sin botón Pagar, porque cobra, no paga). Valor = `precio_mayoreo × vendidas − pagos aceptados`. Solo aparece cuando el artículo tiene `precio_mayoreo` asignado — que el **PRO** puede fijar desde el ⚙ de cada artículo o al subirlo, o el dueño desde su panel. Muestra vendidas y total ya pagado. El botón **Pagar** (total/parcial) crea una **solicitud pendiente** (no descuenta hasta que el dueño/PRO la acepta); mientras hay una pendiente muestra "⏳ En revisión" y se bloquea pedir otra. **🧾 Mis pagos** lista pagos aceptados + pendientes. Solo aparece cuando el dueño ya configuró `precio_mayoreo`.

**"💳 Pagos por aceptar" (solo PRO):** lista de solicitudes pendientes con botones Aceptar/Rechazar. (La sección "📊 Mi Corte" con ganancia se quitó — no se usa por ahora.)

**Historial de ventas ("📋 Ventas"):** cada venta muestra el **costo de mayoreo** del artículo (mapeado por `item_id` contra el inventario), no el precio de venta. El total es la suma de mayoreos = lo que se debe por esas ventas. Los artículos aún sin mayoreo asignado muestran "—".

**Eliminar una venta (solo PRO, por error de captura):** 🗑 en cada fila ya confirmada (no en las "⏳ por confirmar", esas se rechazan por su propio flujo). `DELETE /api/distribuidor/historial?id=X&tipo=inventario|suelta`. Si es de inventario (`ventas_distribuidor`), antes de borrar la fila revierte el artículo: `cantidad += cantidad_vendida`, `vendidas -= cantidad_vendida` — así el stock regresa y el saldo pendiente baja solo (se calcula en vivo desde `vendidas`). Si es una venta suelta confirmada, solo se borra la fila — el saldo ya se recalcula con las confirmadas restantes.

---

## Funcionalidad de pagos

**Flujo en 2 fases (pendiente → aceptado):**

1. El **distribuidor** (cualquier rol) da "Pagar" (total o parcial) → crea una **solicitud** en `solicitudes_pago` con `estado='pendiente'`. Aún **no** descuenta del saldo; se muestra "⏳ En revisión" y se bloquea pedir otro pago mientras haya uno pendiente.
2. El **dueño** (tab Distribuidores) **o** el **PRO** (portal del distribuidor con código admin) ve los "💳 Pagos por aceptar" y **acepta** o **rechaza**.
3. Al **aceptar**, el endpoint inserta el pago real en `pagos_distribuidor` (fuente de verdad del saldo) y marca la solicitud `aceptado` con `pago_id`. Recién ahí baja el saldo y aparece en el historial visible para los tres (distribuidor normal, PRO, admin).
4. Al **rechazar**, la solicitud queda `rechazado` y no afecta el saldo.

El dueño además puede registrar un pago **directo** desde su panel (POST a `pagos_distribuidor`), sin pasar por solicitud, para cuando cobra en persona.

Tipos: `completo` (todo el saldo) / `parcial` (monto libre, con preview "te quedará pendiente: $X").

El sistema es **append-only**: nunca se modifican ni eliminan pagos. El saldo siempre se recalcula como `suma(precio_mayoreo × vendidas) − suma(pagos_distribuidor)` (solo pagos aceptados).

---

## Notas de implementación importantes

- **Fotos**: se comprimen a máx 400px, calidad JPEG 0.65, y se guardan como `base64` en la columna `foto_url`. No se usa storage externo.
- **Tema día/noche (portal del distribuidor)**: switch ☀️/🌙 en el header, guardado en `localStorage` (`dist_theme_${slug}`, default 'dark'). Implementado con **variables CSS** en `.dist-wrap` / `.dist-wrap.light` (`--bg`, `--surface`, `--surface-2/3`, `--text`, `--text-2/3/4`, `--border-1/2`, `--accent`, y `--ov` = triplete RGB para las transparencias, usado como `rgba(var(--ov), α)`). Los colores fijos de `DistribuidorDashboard`, `InventarioTable` y `UploadForm` se convirtieron a `var(--...)`. Los acentos pastel (verde/cian/rojo/ámbar) y el `DistribuidorLogin` siguen fijos (el login siempre oscuro). Un `useEffect` ajusta `document.body.style.background` al tema para el overscroll.
- **Carga lazy de fotos (portal del distribuidor)**: el listado se pide con `?light=1` (sin `foto_url`, solo datos ligeros → saldo, búsqueda y filtros instantáneos). Cada foto se carga sola cuando su tarjeta entra en pantalla, vía el componente `LazyFoto` (IntersectionObserver) que pide `?foto=ID` y cachea el base64 en un `Map` por id. Esto evita descargar ~10 MB de imágenes al abrir el portal con muchos artículos. El panel del dueño (`Distribuidores.jsx`) todavía trae las fotos completas (pendiente de optimizar si crece).
- **FKs en Supabase**: `inventario_distribuidor.id` y `distribuidores.id` son `INTEGER` (SERIAL), **no UUID**. Al crear tablas relacionadas, usar `INTEGER` para las foreign keys.
- **`sb()` helper**: wrapper de fetch para Supabase REST API, disponible en `src/utils.js`. Lanza error si `!res.ok`.
- **Optimistic update** en toggle de `modo_precio`: la UI se actualiza antes de confirmar con el servidor; revierte si falla.
- **`log_venta` pattern**: el PUT de inventario acepta un campo extra `log_venta` que dispara un INSERT secundario en `ventas_distribuidor` sin bloquear la respuesta principal (`.catch(() => {})`).
- **RLS deshabilitado** en todas las tablas de distribuidores.

---

## Migraciones pendientes / aplicadas

Ver `/migrations/` para historial. La migración completa más reciente que debe estar aplicada:

```sql
-- Tablas nuevas
CREATE TABLE IF NOT EXISTS ventas_distribuidor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INTEGER REFERENCES inventario_distribuidor(id) ON DELETE CASCADE,
  distribuidor_id INTEGER REFERENCES distribuidores(id),
  cantidad INT NOT NULL DEFAULT 1,
  precio_venta DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ventas_distribuidor DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pagos_distribuidor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id INTEGER REFERENCES distribuidores(id),
  monto DECIMAL(10,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('parcial', 'completo')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pagos_distribuidor DISABLE ROW LEVEL SECURITY;

-- Columnas agregadas
ALTER TABLE inventario_distribuidor ADD COLUMN IF NOT EXISTS lote_sku TEXT;
ALTER TABLE distribuidores ADD COLUMN IF NOT EXISTS acceso_admin TEXT;
ALTER TABLE distribuidores ADD COLUMN IF NOT EXISTS modo_precio TEXT DEFAULT 'venta';

-- Datos iniciales
UPDATE distribuidores SET acceso_admin = 'GATI2026PRO' WHERE slug = 'gaticueva';
UPDATE distribuidores SET acceso_admin = 'FRIKI2026PRO' WHERE slug = 'friki';
```
