-- Variantes por talla (playeras, etc.) -- opcional por item. Cuando un item tiene
-- tallas, items.stock deja de editarse a mano y pasa a ser la SUMA de sus variantes
-- (se recalcula desde el server cada vez que se guardan). Así todo lo que ya lee
-- items.stock (tarjetas, "agotado", listados) sigue funcionando sin cambios.
alter table items add column if not exists tiene_tallas boolean not null default false;

create table variantes (
  id serial primary key,
  item_id int not null references items(id) on delete cascade,
  talla text not null,
  stock int not null default 0,
  orden int not null default 0,
  unique (item_id, talla)
);
create index variantes_item_idx on variantes (item_id);

alter table variantes enable row level security;
create policy "lectura publica" on variantes for select using (true);
