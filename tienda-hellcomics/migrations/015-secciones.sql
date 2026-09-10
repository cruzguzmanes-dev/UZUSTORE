-- Secciones curadas del Home (Destacados, Descuentos, Lo último, etc.). Reemplaza el
-- flag único items.destacado por algo que el admin arma a mano desde /admin/secciones:
-- crea secciones con el nombre que quiera y les mete/saca los items que quiera.
create table secciones (
  id serial primary key,
  nombre text not null,
  orden int not null default 0,   -- posición en el Home (menor = más arriba)
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table seccion_items (
  id serial primary key,
  seccion_id int not null references secciones(id) on delete cascade,
  item_id int not null references items(id) on delete cascade,
  orden int not null default 0,   -- posición dentro de la sección
  unique (seccion_id, item_id)
);
create index seccion_items_seccion_idx on seccion_items (seccion_id);

alter table secciones enable row level security;
alter table seccion_items enable row level security;
create policy "lectura publica" on secciones for select using (true);
create policy "lectura publica" on seccion_items for select using (true);

-- Migrar lo que ya estaba marcado como destacado a una sección "Destacados".
insert into secciones (nombre, orden) values ('Destacados', 0);
insert into seccion_items (seccion_id, item_id, orden)
select
  (select id from secciones where nombre = 'Destacados' order by id limit 1),
  id,
  (row_number() over (order by destacado_at desc nulls last)) - 1
from items
where destacado = true;
