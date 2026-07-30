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
| `acceso_code` | `basic` | Agregar artículos, editar nombre/precio, marcar vendidos, restock, **ver saldo y registrar pagos** |
| `acceso_admin` | `admin` | Todo lo anterior + corte con ganancia neta + historial de ventas por artículo + precio asignado por dueño |

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
Append-only: el saldo nunca se resetea, siempre es `sum(precio_mayoreo × vendidas) − sum(pagos)`.

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

### `/api/distribuidor/pagos`
- `GET ?slug=X` → historial de pagos del distribuidor
- `POST { slug, monto, tipo, notas? }` → registra un pago

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
3. `UploadForm.jsx` — formulario para agregar artículos (foto requerida; precio opcional según `modo_precio`)
4. `InventarioTable.jsx` — grid de artículos con acciones (editar, vendido, restock; **sin eliminar**)

**Comportamiento por rol:**

| Feature | basic | admin |
|---------|-------|-------|
| Ver inventario | ✅ | ✅ |
| Buscar artículo por nombre | ✅ | ✅ |
| Agregar artículos | ✅ | ✅ |
| Editar nombre y su precio de venta (⚙) | ✅ | ✅ |
| Marcar vendido | ✅ | ✅ |
| Restock (+ Stock) | ✅ | ✅ |
| **Eliminar artículos** | ❌ | ❌ |
| Ver saldo al proveedor + registrar pago | ✅ | ✅ |
| Ver corte con ganancia (📊 Mi Corte) | ❌ | ✅ |
| Ver precio asignado por dueño (`precio_mayoreo`) | ❌ | ✅ |
| Ver historial de ventas por artículo | ❌ | ✅ |
| Ver ganancia acumulada por artículo | ❌ | ✅ (si tiene precio_venta) |

**Card de saldo (todos los roles):** "Le debes al proveedor" = `precio_mayoreo × vendidas − pagos`. Muestra vendidas y total ya pagado, más botones **Pagar** (total/parcial) y **🧾 Mis pagos**. Se actualiza al marcar vendido. Solo aparece cuando el dueño ya configuró `precio_mayoreo` (si no, muestra mensaje pendiente).

**Corte extra (solo admin):**
- "Total ventas" → solo si tiene `precio_venta` en algún artículo
- "Mi ganancia neta" → `total ventas − saldo al proveedor` (solo si tiene `precio_venta`)

---

## Funcionalidad de pagos

Los pagos los puede registrar **tanto el dueño** (tab Distribuidores) **como el propio distribuidor** (desde su portal). Ambos escriben en la misma tabla `pagos_distribuidor`, así que un pago registrado por el distribuidor aparece automáticamente en el historial del dueño y descuenta del saldo.

Tipos de pago:
- **Pago completo / "Pagar todo"** — registra exactamente el saldo pendiente actual (`tipo: 'completo'`)
- **Pago parcial / "Pagar una parte"** — con monto libre; muestra preview "quedará pendiente: $X" (`tipo: 'parcial'`)
- **Historial de pagos** — lista todos los pagos con badge de tipo (parcial/completo); el dueño ve además las notas

El sistema es **append-only**: nunca se modifican ni eliminan pagos. El saldo siempre se recalcula como `suma(precio_mayoreo × vendidas) − suma(todos los pagos)`.

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
