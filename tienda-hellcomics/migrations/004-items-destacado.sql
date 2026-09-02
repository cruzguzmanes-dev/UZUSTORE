-- Flag manual para curar secciones del home (ej. "Últimas oportunidades") -- el dueño
-- elige a mano qué items aparecen, no es automático por stock/fecha/etc.
alter table items
  add column if not exists destacado boolean not null default false,
  add column if not exists destacado_at timestamptz; -- cuándo se marcó, para ordenar (más reciente primero)

create index if not exists items_destacado_idx on items (destacado, destacado_at desc);
