-- Saldo a favor de ZenMarket: cuando saldas depositando más ¥ de los que
-- debías, el sobrante se guarda aquí en vez de perderse. Se guarda junto
-- con su costo en pesos (a la tasa ponderada con la que se obtuvo) para
-- poder pagar envíos futuros directo desde este saldo, sabiendo ya cuánto
-- fue en yenes y cuánto en pesos mexicanos.
CREATE TABLE IF NOT EXISTS saldo_zenmarket (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  jpy        DECIMAL(12,2) NOT NULL DEFAULT 0,
  mxn_costo  DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT saldo_zenmarket_singleton CHECK (id = 1)
);
INSERT INTO saldo_zenmarket (id, jpy, mxn_costo)
  VALUES (1, 0, 0)
  ON CONFLICT (id) DO NOTHING;
ALTER TABLE saldo_zenmarket DISABLE ROW LEVEL SECURITY;
