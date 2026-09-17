-- Permite registrar una "compra" directo en pesos, sin pasar por yenes ni por
-- el flujo de Saldar -- para piezas que ya tenías de hace tiempo (compradas
-- con otra tasa de conversión, o sin relación con el crédito de ZenMarket) y
-- que ahora se agregan a un paquete. precio_mxn se captura directo y la
-- compra queda "pagada" de una vez.
ALTER TABLE lotes_compra ALTER COLUMN precio_jpy DROP NOT NULL;
ALTER TABLE lotes_compra DROP CONSTRAINT IF EXISTS lotes_compra_precio_jpy_check;
ALTER TABLE lotes_compra ADD CONSTRAINT lotes_compra_precio_jpy_check
  CHECK (precio_jpy IS NULL OR precio_jpy > 0);
