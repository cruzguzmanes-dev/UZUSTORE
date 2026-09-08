-- "Público": visible o no en el catálogo del sitio, independiente de "estado"
-- (activo/agotado/oculto). Pensado para cargar TODO el inventario físico como items
-- (control interno, ventas, etc.) sin que todo se publique en la tienda -- ej. piezas que
-- todavía no quieren anunciar. Default true para no afectar nada de lo ya cargado.
alter table items add column if not exists publico boolean not null default true;
create index if not exists items_publico_idx on items (publico);

-- Link a una reseña en video (FB/IG/TikTok) que el propio negocio grabó -- opcional.
alter table items add column if not exists video_url text;

-- La búsqueda pública también debe excluir los items no públicos.
create or replace function buscar_items(q text, p_offset int default 0)
returns setof items as $$
  select *
  from items
  where estado <> 'oculto'
    and publico = true
    and (
      search_vector @@ plainto_tsquery('spanish', q)
      or nombre % q
    )
  order by
    ts_rank(search_vector, plainto_tsquery('spanish', q)) desc,
    similarity(nombre, q) desc
  limit 10 offset p_offset;
$$ language sql stable;
