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
| `acceso_code` | `basic` (Normal) | Editar nombre y su precio de venta, marcar vendidos, restock, **ver saldo y solicitar pagos**, ver historiales de ventas y pagos. NO puede agregar inventario ni tocar el mayoreo. |
| `acceso_admin` | `admin` (PRO) | Todo lo anterior + **agregar inventario** (con precio de mayoreo) + **aceptar/rechazar pagos** + corte con ganancia y total a cobrar |

Los historiales de **ventas** ("📋 Ventas") y de **pagos** ("🧾 Pagos") son botones arriba visibles para **ambos** roles.

El header del portal muestra un badge **NORMAL** / **PRO** junto a "Gestiona tu inventario" según el código con el que se entró.

> **Ningún rol puede eliminar artículos.** Borrar es exclusivo del dueño desde su panel admin. El saldo pendiente y el flujo de pago (total/parcial) son visibles para **ambos** roles.

Los códigos actuales:
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
created_at      TIMESTAMPTZ DEFAULT NOW()
```

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
- `POST { distribuidor, nombre?, foto_url?, precio_venta?, precio_mayoreo?, cantidad }` → crea artículo (el dueño usa `precio_mayoreo` en el alta rápida; el distribuidor usa `precio_venta`)
- `PUT ?id=X { cantidad?, vendidas?, precio_mayoreo?, nombre?, precio_venta?, lote_sku?, foto_url?, log_venta? }` → actualiza; si `log_venta` presente, inserta en `ventas_distribuidor`
- `DELETE ?id=X` → elimina artículo (solo se invoca desde el panel del dueño; el portal del distribuidor ya no expone borrado)

### `/api/distribuidor/historial`
- `GET ?item_id=X` → historial de ventas de un artículo (`ventas_distribuidor` ordenado por fecha desc)
- `GET ?distribuidor=slug` → historial de ventas de todo el distribuidor (usado por la sección "📋 Historial de ventas" del portal PRO)

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
2. `DistribuidorDashboard.jsx` — carga inventario, pagos y datos del distribuidor; incluye card de saldo, flujo de pago y buscador
3. `UploadForm.jsx` — formulario para agregar artículos. **Solo visible para PRO** (`{isAdmin && <UploadForm asOwner />}`); captura precio de mayoreo.
4. `InventarioTable.jsx` — grid de artículos con acciones (editar nombre/precio, vendido, restock; **sin eliminar, sin historial por celda**)

**Comportamiento por rol:**

| Feature | basic | admin |
|---------|-------|-------|
| Ver inventario | ✅ | ✅ |
| Buscar artículo por nombre | ✅ | ✅ |
| **Agregar artículos** (formulario de alta) | ❌ | ✅ |
| Editar nombre y su precio de venta (⚙) | ✅ | ✅ |
| Marcar vendido | ✅ | ✅ |
| Restock (+ Stock) | ✅ | ✅ |
| **Eliminar artículos** | ❌ | ❌ |
| Ver saldo al proveedor + **solicitar** pago (total/parcial) | ✅ | ✅ |
| Subir inventario con **precio de mayoreo** (como el dueño) | ❌ | ✅ |
| **Aceptar/rechazar** solicitudes de pago | ❌ | ✅ |
| Ver corte con ganancia + total a cobrar (📊 Mi Corte) | ❌ | ✅ |
| Ver precio asignado por dueño (`precio_mayoreo`) | ❌ | ✅ |
| Ver historial de ventas y de pagos (botones "📋 Ventas" / "🧾 Pagos" arriba, no por celda) | ✅ | ✅ |
| Ver ganancia acumulada por artículo | ❌ | ✅ (si tiene precio_venta) |

Solo el PRO ve el formulario de alta (`asOwner`), y captura **precio de mayoreo** (lo que cobra el dueño). El distribuidor normal no agrega inventario; solo edita nombre y su **precio de venta** en artículos existentes.

**Card de saldo (todos los roles):** "Le debes al proveedor" = `precio_mayoreo × vendidas − pagos aceptados`. Muestra vendidas y total ya pagado. El botón **Pagar** (total/parcial) crea una **solicitud pendiente** (no descuenta hasta que el dueño/PRO la acepta); mientras hay una pendiente muestra "⏳ En revisión" y se bloquea pedir otra. **🧾 Mis pagos** lista pagos aceptados + pendientes. Solo aparece cuando el dueño ya configuró `precio_mayoreo`.

**Corte extra (solo admin/PRO):**
- "Total ventas" → solo si tiene `precio_venta` en algún artículo
- "Total a cobrar (mayoreo)" → `precio_mayoreo × vendidas`
- "Mi ganancia neta" → `total ventas − total a cobrar` (solo si tiene `precio_venta`)
- **"💳 Pagos por aceptar"** → lista de solicitudes pendientes con botones Aceptar/Rechazar

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
