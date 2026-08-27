-- Dimensiones + peso del paquete, capturados al empacar en ZenMarket
-- (paso 2 del flujo de Almacén). Se guarda tal cual como texto libre
-- (ej. "72cm × 27cm × 31cm - 6950g") en vez de columnas separadas, ya
-- que ZenMarket lo entrega así de una sola vez. El campo "nombre" del
-- paquete deja de pedirse en el formulario -- el identificador real es
-- id_zenmarket -- pero la columna se conserva (NOT NULL) y se auto-llena
-- con el id_zenmarket.

ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS dimensiones TEXT;

ALTER TABLE paquetes
  DROP COLUMN IF EXISTS peso_kg,
  DROP COLUMN IF EXISTS largo,
  DROP COLUMN IF EXISTS ancho,
  DROP COLUMN IF EXISTS alto;
