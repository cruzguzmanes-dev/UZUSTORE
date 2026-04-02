-- Catálogo de empaques (cajas)
CREATE TABLE IF NOT EXISTS empaques (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,           -- auto-generado: "20x20x15"
  largo INT NOT NULL,
  ancho INT NOT NULL,
  alto INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,  -- costo de la caja
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE empaques DISABLE ROW LEVEL SECURITY;

-- Asignación de caja a orden ML (relación 1:1 por orden)
CREATE TABLE IF NOT EXISTS orden_empaque (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,  -- ID de la orden de MercadoLibre
  empaque_id INTEGER NOT NULL REFERENCES empaques(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orden_empaque DISABLE ROW LEVEL SECURITY;
