-- Historial de ventas. Se registra manualmente desde /admin (botón "Vender"), separado
-- del +/- de stock que ya existía -- ese sigue siendo solo para corregir el conteo
-- (se rompió, se perdió, error de captura), sin contarse como venta.
create table ventas (
  id serial primary key,
  item_id int references items(id) on delete set null,
  item_nombre text not null,        -- copia del nombre -- sobrevive aunque el item se borre después
  talla text,                       -- solo si el item maneja tallas
  cantidad int not null default 1,
  precio_unitario decimal(10,2) not null,
  total decimal(10,2) not null,
  created_at timestamptz not null default now()
);
create index ventas_created_idx on ventas (created_at desc);

-- Nunca se expone al público -- los ingresos son información privada del negocio.
-- RLS habilitado sin policy de select: nadie con la key pública puede leerla, solo el
-- server con service_role (igual que config/login_intentos).
alter table ventas enable row level security;
