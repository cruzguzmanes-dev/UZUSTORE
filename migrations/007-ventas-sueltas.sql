-- 007-ventas-sueltas.sql
-- Ventas de piezas que NO están inventariadas (stock viejo que el dueño dejó al
-- distribuidor). El NORMAL registra solo el nombre → queda 'pendiente'. El PRO le
-- pone el precio de mayoreo y la 'confirma' → se suma al saldo (ventas por pagar).

CREATE TABLE IF NOT EXISTS ventas_sueltas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id INTEGER REFERENCES distribuidores(id),
  nombre          TEXT NOT NULL,
  cantidad        INT NOT NULL DEFAULT 1,
  precio_mayoreo  DECIMAL(10,2),        -- lo pone el PRO al confirmar
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'rechazada')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ
);

ALTER TABLE ventas_sueltas DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ventas_sueltas_dist ON ventas_sueltas(distribuidor_id, estado);
