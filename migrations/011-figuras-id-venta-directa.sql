-- Permite marcar una figura como lista para vender sin pasar por MercadoLibre:
-- id_venta_directa es un ID interno de texto libre (sin integración con
-- inventario_distribuidor todavía). Una figura queda "publicable" cuando
-- tiene ml_sku O id_venta_directa.

ALTER TABLE figuras
  ADD COLUMN IF NOT EXISTS id_venta_directa TEXT;
