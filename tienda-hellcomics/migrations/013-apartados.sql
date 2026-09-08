-- Sistema de apartados (layaway): el comprador reserva 1+ items, se les resta el stock
-- de inmediato, y va abonando hasta completar el total. Cada abono también se refleja
-- en el historial de ventas (tabla `ventas`) como ingreso real.
create table apartados (
  id serial primary key,
  cliente_nombre text not null,
  cliente_telefono text not null,
  subtotal decimal(10,2) not null,   -- suma de precio de lista de las líneas
  total decimal(10,2) not null,      -- lo acordado con el cliente (puede traer descuento)
  pagado decimal(10,2) not null default 0,
  estado text not null default 'activo' check (estado in ('activo', 'completado', 'cancelado')),
  created_at timestamptz not null default now()
);

create table apartado_lineas (
  id serial primary key,
  apartado_id int not null references apartados(id) on delete cascade,
  item_id int references items(id) on delete set null,
  item_nombre text not null,
  talla text,
  cantidad int not null default 1,
  precio_unitario decimal(10,2) not null,
  total decimal(10,2) not null
);
create index apartado_lineas_apartado_idx on apartado_lineas (apartado_id);

create table apartado_abonos (
  id serial primary key,
  apartado_id int not null references apartados(id) on delete cascade,
  monto decimal(10,2) not null,
  created_at timestamptz not null default now()
);
create index apartado_abonos_apartado_idx on apartado_abonos (apartado_id);

-- Nunca se expone al público -- son datos de contacto de clientes y dinero del negocio.
alter table apartados enable row level security;
alter table apartado_lineas enable row level security;
alter table apartado_abonos enable row level security;
