-- Ubicación física (caja/anaquel) -- opcional, para encontrar rápido un cómic entre
-- muchas cajas. Formato libre sugerido: A-1, A-2, B-1... el negocio decide su propia
-- convención.
alter table items add column if not exists ubicacion text;
create index if not exists items_ubicacion_idx on items (ubicacion) where ubicacion is not null;
