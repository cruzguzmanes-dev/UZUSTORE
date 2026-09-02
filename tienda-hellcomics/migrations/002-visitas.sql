-- Contador de visitas del sitio público (home, resultados, producto -- no el admin).
-- Una fila por visita, nada de IP ni datos personales -- solo qué página y cuándo,
-- lo mínimo para poder sacar totales.

create table visitas (
  id bigserial primary key,
  path text not null,
  created_at timestamptz not null default now()
);
create index visitas_created_idx on visitas (created_at desc);

-- RLS: respaldo, no es la línea principal de defensa (ver nota en 001-catalogo-inicial.sql).
-- El registro de visitas y su lectura pasan por rutas de servidor con service_role.
alter table visitas enable row level security;
