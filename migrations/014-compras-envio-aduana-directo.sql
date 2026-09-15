-- Permite capturar envío y aduana directamente en una compra suelta, para
-- piezas que llegaron mezcladas en un paquete viejo (no manejable con el
-- flujo normal de Paquetes). Montos ya en MXN y totales para toda la
-- compra (igual que precio_mxn), no por pieza.
ALTER TABLE lotes_compra
  ADD COLUMN IF NOT EXISTS costo_envio_mxn  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS costo_aduana_mxn DECIMAL(10,2);
