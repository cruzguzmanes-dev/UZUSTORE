-- Registro de ajustes al saldo a favor de ZenMarket -- cargos que le bajan tu
-- saldo real sin pasar por una compra o un envío específico (almacenamiento
-- por plazo excedido, comisiones, etc.). No se prorratean a ningún producto,
-- solo se descuentan del saldo y quedan aquí para llevar control de cuándo y
-- cuánto se gastó.
CREATE TABLE IF NOT EXISTS gastos_zenmarket (
  id         SERIAL PRIMARY KEY,
  fecha      DATE NOT NULL,
  jpy        DECIMAL(12,2) NOT NULL,
  mxn        DECIMAL(12,2) NOT NULL,
  concepto   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE gastos_zenmarket DISABLE ROW LEVEL SECURITY;
