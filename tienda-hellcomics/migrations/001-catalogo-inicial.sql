-- Catálogo público de Hell Comics México -- esquema inicial.
-- Tablas propias, aisladas del proyecto UZUSTORE principal (sin FK ni relación).
--
-- Nota de seguridad: `items.costo` es privado (precio de compra, para calcular ganancia
-- después). Ninguna key de Supabase se manda al navegador en esta app -- toda lectura y
-- escritura pasa por rutas de servidor de Next.js con la service_role key, que elige a
-- mano qué columnas devolver en cada endpoint público. RLS se deja activado como
-- respaldo (defensa en profundidad), pero la seguridad real no depende de eso.

create extension if not exists pg_trgm;

create table categorias (
  id serial primary key,
  nombre text not null,
  slug text unique not null,
  orden int not null default 0
);

create table items (
  id serial primary key,
  nombre text not null,
  slug text unique not null,
  descripcion text,
  precio decimal(10,2) not null check (precio >= 0),
  costo decimal(10,2) check (costo is null or costo >= 0), -- opcional; privado, no se expone al público
  stock int not null default 0 check (stock >= 0),
  categoria_id int references categorias(id) on delete set null,
  estado text not null default 'activo' check (estado in ('activo', 'agotado', 'oculto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(descripcion, '')), 'B')
  ) stored
);
create index items_search_idx on items using gin (search_vector);
create index items_nombre_trgm_idx on items using gin (nombre gin_trgm_ops);
create index items_categoria_idx on items (categoria_id);
create index items_created_idx on items (created_at desc);

create table imagenes (
  id serial primary key,
  item_id int not null references items(id) on delete cascade,
  url text not null,
  orden int not null default 0
);
create index imagenes_item_idx on imagenes (item_id, orden);

create table tags (
  id serial primary key,
  nombre text unique not null
);

create table item_tags (
  item_id int not null references items(id) on delete cascade,
  tag_id int not null references tags(id) on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on item_tags (tag_id);

create table config (
  id int primary key default 1,
  acceso_admin_hash text not null,
  whatsapp_numero text not null,
  constraint config_singleton check (id = 1)
);

-- Intentos de login fallidos por IP, para poder bloquear (el sitio es público).
create table login_intentos (
  ip text primary key,
  fallos int not null default 0,
  bloqueado_hasta timestamptz
);

-- Mantiene updated_at al día en cada UPDATE de items.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_set_updated_at
before update on items
for each row execute function set_updated_at();

-- Búsqueda: relevancia (texto completo) + tolerancia a errores de tecleo (trigram),
-- paginada de 10 en 10.
create or replace function buscar_items(q text, p_offset int default 0)
returns setof items as $$
  select *
  from items
  where estado = 'activo'
    and (
      search_vector @@ plainto_tsquery('spanish', q)
      or nombre % q
    )
  order by
    ts_rank(search_vector, plainto_tsquery('spanish', q)) desc,
    similarity(nombre, q) desc
  limit 10 offset p_offset;
$$ language sql stable;

-- RLS: respaldo, no es la línea principal de defensa (ver nota arriba). Nadie llama a
-- Supabase directo desde el navegador en esta app, pero se deja correcto por si acaso.
alter table categorias enable row level security;
alter table items enable row level security;
alter table imagenes enable row level security;
alter table tags enable row level security;
alter table item_tags enable row level security;
alter table config enable row level security;       -- sin policy de select: nadie externo la lee
alter table login_intentos enable row level security; -- sin policy de select: nadie externo la lee

create policy "lectura publica" on categorias for select using (true);
create policy "lectura publica" on items for select using (estado <> 'oculto');
create policy "lectura publica" on imagenes for select using (true);
create policy "lectura publica" on tags for select using (true);
create policy "lectura publica" on item_tags for select using (true);

grant execute on function buscar_items(text, int) to anon, authenticated;

-- Bucket público de Storage para las imágenes de los items (no base64-en-columna).
-- Las subidas siempre pasan por /api/admin/upload con la service_role key -- el bucket
-- es "public" solo para que las URLs de lectura funcionen directo desde el navegador.
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do nothing;

-- Fila única de configuración -- reemplazar 'CAMBIA-ESTO' con un hash real
-- (correr `npm run hash-code -- "tu-codigo"` y pegar el resultado aquí) antes de usar el panel.
insert into config (id, acceso_admin_hash, whatsapp_numero)
values (1, 'CAMBIA-ESTO', '5210000000')
on conflict (id) do nothing;
