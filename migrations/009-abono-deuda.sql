-- 009-abono-deuda.sql
-- Permite marcar qué parte de un pago NO corresponde a ventas, sino a saldación
-- de deuda vieja del distribuidor. Esa parte NUNCA se abona a ventas futuras.
--   saldo de ventas   = Σ(precio_mayoreo × vendidas) − Σ(monto − monto_deuda)
--   abonado a deuda   = Σ(monto_deuda)
-- El dueño/PRO decide monto_deuda al aceptar el pago (default = excedente sobre el saldo).

ALTER TABLE pagos_distribuidor
  ADD COLUMN IF NOT EXISTS monto_deuda DECIMAL(10,2) NOT NULL DEFAULT 0;
