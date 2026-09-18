-- Permite que un gasto_zenmarket sea un ajuste a la DEUDA (no al saldo a
-- favor): un renglón más dentro de "Por saldar", junto a compras y envíos,
-- que se liquida (recibe su valor en pesos) hasta el próximo Saldar real.
-- mxn se vuelve nullable porque estos gastos "pendientes" no tienen un tipo
-- de cambio todavía al crearse -- se les asigna hasta que se saldan.
ALTER TABLE gastos_zenmarket
  ALTER COLUMN mxn DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS pendiente BOOLEAN NOT NULL DEFAULT false;
