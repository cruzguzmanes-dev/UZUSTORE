-- Crear tabla distribuidores
CREATE TABLE IF NOT EXISTS distribuidores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  acceso_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla inventario_distribuidor
CREATE TABLE IF NOT EXISTS inventario_distribuidor (
  id SERIAL PRIMARY KEY,
  distribuidor_id INTEGER NOT NULL REFERENCES distribuidores(id) ON DELETE CASCADE,
  nombre TEXT,
  foto_url TEXT,
  costo_unitario DECIMAL(10,2) NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  vendidas INTEGER DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_inventario_distribuidor_id ON inventario_distribuidor(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_inventario_cantidad ON inventario_distribuidor(distribuidor_id, cantidad);

-- Insertar distribuidores iniciales
INSERT INTO distribuidores (nombre, slug) VALUES
  ('Gaticueva', 'gaticueva'),
  ('Friki', 'friki')
ON CONFLICT (slug) DO NOTHING;
