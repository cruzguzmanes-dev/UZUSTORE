-- Carril B: sistema de compras automático
-- figuras → lotes_compra → paquetes → lotes (auto-generados)

-- Catálogo de figuras
CREATE TABLE IF NOT EXISTS figuras (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  id_provisional  TEXT UNIQUE NOT NULL,    -- auto: "FIG-001", "FIG-002", ...
  ml_sku          TEXT,                    -- null hasta tener SKU de MercadoLibre
  imagen_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE figuras DISABLE ROW LEVEL SECURITY;

-- Lotes de compra: cada vez que se compran X unidades de una figura
CREATE TABLE IF NOT EXISTS lotes_compra (
  id                SERIAL PRIMARY KEY,
  figura_id         INTEGER NOT NULL REFERENCES figuras(id) ON DELETE RESTRICT,
  cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
  precio_jpy        DECIMAL(10,0) NOT NULL CHECK (precio_jpy > 0),  -- precio ¥ por pieza
  precio_mxn        DECIMAL(10,2),          -- null hasta saber el tipo de cambio al pagar
  fecha_compra      DATE NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'pagado', 'en_transito', 'recibido')),
  lote_generado_id  INTEGER,               -- id del lote en tabla lotes (se llena al generar)
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lotes_compra DISABLE ROW LEVEL SECURITY;

-- Paquetes de envío desde Japón
CREATE TABLE IF NOT EXISTS paquetes (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL,
  costo_envio_mxn   DECIMAL(10,2),         -- null hasta pagarlo
  costo_aduana_mxn  DECIMAL(10,2),         -- null hasta pagarlo
  estado            TEXT NOT NULL DEFAULT 'armando'
                      CHECK (estado IN ('armando', 'en_transito', 'en_aduana', 'recibido')),
  fecha_envio       DATE,
  fecha_llegada     DATE,
  lotes_generados   BOOLEAN DEFAULT FALSE, -- true cuando ya se corrió "Generar Lotes"
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE paquetes DISABLE ROW LEVEL SECURITY;

-- Contenido de cada paquete (qué lotes_compra viajan en qué paquete)
CREATE TABLE IF NOT EXISTS paquete_items (
  id              SERIAL PRIMARY KEY,
  paquete_id      INTEGER NOT NULL REFERENCES paquetes(id) ON DELETE CASCADE,
  lote_compra_id  INTEGER NOT NULL REFERENCES lotes_compra(id) ON DELETE RESTRICT,
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  UNIQUE(paquete_id, lote_compra_id)
);
ALTER TABLE paquete_items DISABLE ROW LEVEL SECURITY;
