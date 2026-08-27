-- Peso y dimensiones del paquete, capturados al empacar en ZenMarket
-- (paso 2 del flujo de Almacén). El campo "nombre" del paquete deja de
-- pedirse en el formulario -- el identificador real es id_zenmarket -- pero
-- la columna se conserva (NOT NULL) y se auto-llena con el id_zenmarket.

ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS largo INT,
  ADD COLUMN IF NOT EXISTS ancho INT,
  ADD COLUMN IF NOT EXISTS alto INT;
