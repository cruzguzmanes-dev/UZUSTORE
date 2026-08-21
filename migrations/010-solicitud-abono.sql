-- 010-solicitud-abono.sql
-- Marca una solicitud de pago como "abono a deuda": dinero que NO viene de ventas,
-- va 100% a saldación de deuda vieja. Al aceptarla, el pago se crea con
-- monto_deuda = monto (todo a deuda, no toca el saldo de ventas).

ALTER TABLE solicitudes_pago
  ADD COLUMN IF NOT EXISTS es_abono BOOLEAN NOT NULL DEFAULT false;
