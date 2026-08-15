# UZUSTORE — Contexto del Proyecto

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
- **Inventario** — tabla de lotes comprados con costo unitario y SKU
- **Impuestos** — retenciones IVA/ISR calculadas sobre base gravable
- **Órdenes** — tabla completa con FIFO aplicado
- **Distribuidores** — gestión de proveedores externos (ver sección abajo)

### Lotes (inventario del dueño)
Tabla `lotes` en Supabase. Campos clave: `titulo`, `sku`, `cantidad_disponible`, `costo_unitario`, `fecha_compra`. Se usa FIFO para calcular costo de cada venta.

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
monto           DECIMAL(10,2) NOT NULL
tipo            TEXT CHECK (tipo IN ('parcial', 'completo'))
notas           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```
Append-only: el saldo nunca se resetea, siempre es `sum(precio_mayoreo × vendidas) − sum(pagos)`. Un pago entra aquí de dos formas: registrado directo por el dueño, o al **aceptar** una `solicitudes_pago`.

### `solicitudes_pago`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
distribuidor_id INTEGER REFERENCES distribuidores(id)
monto           DECIMAL(10,2) NOT NULL
tipo            TEXT CHECK (tipo IN ('parcial', 'completo'))
estado          TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado'))
notas           TEXT
pago_id         UUID          -- id del pago creado en pagos_distribuidor al aceptar
created_at      TIMESTAMPTZ DEFAULT NOW()
resolved_at     TIMESTAMPTZ   -- cuándo se aceptó/rechazó
```
Flujo de pagos en 2 fases: el distribuidor crea la solicitud (`pendiente`); el dueño o el PRO la acepta (inserta pago real + marca `aceptado`) o la rechaza. Migración: `migrations/006-solicitudes-pago.sql`.

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
| Toggle "ver mi precio de venta" (localStorage) | ✅ | — |
| **Eliminar artículos** | ❌ | ❌ |
| Ver saldo al proveedor + **solicitar** pago (total/parcial) | ✅ | ✅ |
| Subir inventario con **precio de mayoreo** (como el dueño) | ❌ | ✅ |
| **Aceptar/rechazar** solicitudes de pago | ❌ | ✅ |
| Registrar **venta suelta** (pieza sin inventario, solo nombre) | ✅ | ❌ |
| **Confirmar ventas sueltas** (ponerles el mayoreo) | ❌ | ✅ |
| **Inventariar pieza pasada** (foto + nombre + cantidad → a aprobación) | ✅ | ❌ |
| **Aprobar inventario propuesto** (ponerle el mayoreo) | ❌ | ✅ |

Para el **PRO**, las solicitudes entrantes ("🧾 Ventas por confirmar" y "💳 Pagos por aceptar") se muestran **hasta arriba de todo** (después del header, antes de las stats), para que las vea al abrir.
| Ver "💳 Pagos por aceptar" (aceptar/rechazar solicitudes) | ❌ | ✅ |
| Ver el `precio_mayoreo` en la tarjeta (solo lectura, en chico junto al precio de venta) | ✅ | ✅ |
| **Editar** el `precio_mayoreo` | ❌ | ✅ |
| Ver historial de ventas y de pagos (botones "📋 Ventas" / "🧾 Pagos" arriba, no por celda) | ✅ | ✅ |
| Ver ganancia acumulada por artículo | ❌ | ✅ (si tiene precio_venta) |

El PRO ve el formulario de alta con precio (`asOwner`, captura **costo distribuidor** = `precio_mayoreo`). El normal no agrega inventario con precio, pero sí puede **proponerlo** (`UploadForm proposal`, foto+nombre+cantidad → pendiente). En la UI, `precio_mayoreo` se muestra como **"Costo distribuidor"**.

**Toggle "ver mi precio de venta" (solo NORMAL, `localStorage` key `dist_ver_venta_${slug}`, default ON)** — controla solo la vista del normal, sin tocar el `modo_precio` del dueño:
- **ON**: precio de venta en grande + "costo dist." en chico + campo de venta editable (tarjeta actual).
- **OFF**: solo el **costo distribuidor** en grande, sin precio de venta (ni campo de venta en el ⚙).
Para el PRO siempre es ON. El normal ya **no** ve "+ Stock" (solo "✓ Vendido"); el restock es solo del PRO.

**Card de saldo (todos los roles, es lo primero al entrar):** Normal ve **"Le debes al proveedor"** (con botón Pagar); PRO ve **"Te deben actualmente"** (sin botón Pagar, porque cobra, no paga). Valor = `precio_mayoreo × vendidas − pagos aceptados`. Solo aparece cuando el artículo tiene `precio_mayoreo` asignado — que el **PRO** puede fijar desde el ⚙ de cada artículo o al subirlo, o el dueño desde su panel. Muestra vendidas y total ya pagado. El botón **Pagar** (total/parcial) crea una **solicitud pendiente** (no descuenta hasta que el dueño/PRO la acepta); mientras hay una pendiente muestra "⏳ En revisión" y se bloquea pedir otra. **🧾 Mis pagos** lista pagos aceptados + pendientes. Solo aparece cuando el dueño ya configuró `precio_mayoreo`.

**"💳 Pagos por aceptar" (solo PRO):** lista de solicitudes pendientes con botones Aceptar/Rechazar. (La sección "📊 Mi Corte" con ganancia se quitó — no se usa por ahora.)

**Historial de ventas ("📋 Ventas"):** cada venta muestra el **costo de mayoreo** del artículo (mapeado por `item_id` contra el inventario), no el precio de venta. El total es la suma de mayoreos = lo que se debe por esas ventas. Los artículos aún sin mayoreo asignado muestran "—".

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
