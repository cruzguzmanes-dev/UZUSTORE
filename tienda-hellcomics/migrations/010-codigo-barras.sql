-- Código de barras/QR del item -- por ahora solo se captura al crear/editar (escaneando
-- con la cámara del celular). El índice parcial es para cuando más adelante se use para
-- buscar rápido al momento de vender.
alter table items add column if not exists codigo_barras text;
create index if not exists items_codigo_barras_idx on items (codigo_barras) where codigo_barras is not null;
