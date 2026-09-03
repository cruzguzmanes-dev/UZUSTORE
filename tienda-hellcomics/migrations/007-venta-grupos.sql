-- Ventas combinadas (varios productos en una sola transacción, con descuento sobre el
-- total). El "Vender" normal de cada item sigue siendo precio de lista, sin grupo.
create table venta_grupos (
  id serial primary key,
  subtotal decimal(10,2) not null,  -- suma de precio de lista de todas las líneas
  total decimal(10,2) not null,     -- lo que realmente se cobró (puede traer descuento)
  created_at timestamptz not null default now()
);

alter table ventas add column if not exists grupo_id int references venta_grupos(id) on delete set null;
create index if not exists ventas_grupo_idx on ventas (grupo_id);

alter table venta_grupos enable row level security;
