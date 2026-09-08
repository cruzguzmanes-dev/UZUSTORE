-- El código de barras de fábrica suele venir distinto POR TALLA en ropa (playeras),
-- pero a nivel de todo el item en cómics/figuras (que no manejan tallas). Se agrega el
-- campo también en variantes -- items.codigo_barras (migración 010) sigue usándose para
-- lo que no tiene tallas.
alter table variantes add column if not exists codigo_barras text;
create index if not exists variantes_codigo_barras_idx on variantes (codigo_barras) where codigo_barras is not null;
