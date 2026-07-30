-- 006-solicitudes-pago.sql
-- Flujo de pagos en 2 fases para distribuidores.
-- El distribuidor solicita un pago (estado 'pendiente'); el dueño o el PRO lo
-- acepta o rechaza. Al ACEPTAR se inserta el pago real en pagos_distribuidor
-- (que sigue siendo la fuente de verdad del saldo). Solo los aceptados descuentan.

CREATE TABLE IF NOT EXISTS solicitudes_pago (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id INTEGER REFERENCES distribuidores(id),
  monto           DECIMAL(10,2) NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('parcial', 'completo')),
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado')),
  notas           TEXT,
  pago_id         UUID,                 -- id del pago creado en pagos_distribuidor al aceptar
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ           -- cuándo se aceptó/rechazó
);

ALTER TABLE solicitudes_pago DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_solicitudes_pago_dist ON solicitudes_pago(distribuidor_id, estado);
