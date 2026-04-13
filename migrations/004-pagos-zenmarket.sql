-- Pagos / recargas de saldo a ZenMarket
-- Cuando se paga MXN → se obtienen ¥ → tipo_cambio = mxn / jpy
-- Ese tipo_cambio aplica a todos los paquetes cubiertos por ese pago

CREATE TABLE IF NOT EXISTS pagos_zenmarket (
  id            SERIAL PRIMARY KEY,
  fecha         DATE NOT NULL,
  mxn_pagados   DECIMAL(10,2) NOT NULL CHECK (mxn_pagados > 0),
  jpy_obtenidos DECIMAL(10,0) NOT NULL CHECK (jpy_obtenidos > 0),
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pagos_zenmarket DISABLE ROW LEVEL SECURITY;

-- Agregar nuevas columnas a paquetes
ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS id_zenmarket      TEXT,
  ADD COLUMN IF NOT EXISTS costo_envio_jpy   DECIMAL(10,0),
  ADD COLUMN IF NOT EXISTS pago_zenmarket_id INTEGER REFERENCES pagos_zenmarket(id) ON DELETE SET NULL;

-- Eliminar columna obsoleta (el envío estaba en MXN, ahora es en JPY)
ALTER TABLE paquetes DROP COLUMN IF EXISTS costo_envio_mxn;
