-- 008-inventario-estado.sql
-- Permite que el usuario NORMAL proponga inventario de piezas pasadas
-- (foto + nombre + cantidad). La pieza queda 'pendiente' hasta que el PRO le pone
-- el costo de distribuidor y la aprueba → 'activo'. Rechazar → 'rechazada' (se
-- guarda, no se borra; luego se decide qué hacer con ellas). Los artículos
-- existentes quedan 'activo' por default (retrocompatible).

ALTER TABLE inventario_distribuidor
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo'
  CHECK (estado IN ('activo', 'pendiente', 'rechazada'));

-- Si ya habías corrido esta migración con el CHECK viejo, corre además:
--   ALTER TABLE inventario_distribuidor DROP CONSTRAINT IF EXISTS inventario_distribuidor_estado_check;
--   ALTER TABLE inventario_distribuidor ADD CONSTRAINT inventario_distribuidor_estado_check CHECK (estado IN ('activo','pendiente','rechazada'));
