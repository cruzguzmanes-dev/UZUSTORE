-- Marca si ya se corrió "Repartir a Compras" para este paquete, para que el
-- botón desaparezca una vez usado y solo reaparezca si se agregan más
-- artículos después (lo que dejaría el reparto anterior desactualizado).
ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS costos_repartidos BOOLEAN NOT NULL DEFAULT false;
