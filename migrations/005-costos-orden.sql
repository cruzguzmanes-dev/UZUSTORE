-- Costos manuales por orden (sustituye temporalmente al cálculo FIFO desde lotes).
-- Cada fila vive ligada al order_id de MercadoLibre; cuando el sistema automático
-- esté listo, esta tabla sigue siendo válida como override manual.

CREATE TABLE IF NOT EXISTS costos_orden (
  id              SERIAL PRIMARY KEY,
  order_id        TEXT UNIQUE NOT NULL,
  costo_unitario  NUMERIC NOT NULL CHECK (costo_unitario >= 0),
  cantidad        INTEGER,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE costos_orden DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_costos_orden_order_id ON costos_orden(order_id);
