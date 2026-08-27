-- Simplifica paquetes.estado a solo 'armando' / 'pagado' -- ya no importa
-- distinguir en_transito/en_aduana/recibido, lo único relevante es si ya
-- se pagó el envío. "Llegó" ahora se infiere de tener costo_aduana_mxn
-- capturado (se guarda fecha_llegada en ese momento), no de un estado
-- aparte.
UPDATE paquetes SET estado = 'pagado' WHERE estado IN ('en_transito', 'en_aduana', 'recibido');

ALTER TABLE paquetes DROP CONSTRAINT IF EXISTS paquetes_estado_check;
ALTER TABLE paquetes ADD CONSTRAINT paquetes_estado_check CHECK (estado IN ('armando', 'pagado'));

-- El crédito de ZenMarket solo cubre compras -- el envío se paga aparte,
-- con puntos ya depositados, no con crédito. Este flag marca qué
-- paquetes armados (sin pago) se quieren incluir en la próxima
-- liquidación ("Saldar"): su costo_envio_jpy se suma al total pendiente.
ALTER TABLE paquetes
  ADD COLUMN IF NOT EXISTS envio_agregado_a_saldar BOOLEAN NOT NULL DEFAULT false;
