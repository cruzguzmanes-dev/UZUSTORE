-- La búsqueda de texto ahora también encuentra items "agotado" (antes solo 'activo'),
-- para que la gente pueda preguntar por algo que ya se vendió. Solo 'oculto' se sigue
-- excluyendo -- esto solo alinea la función con la policy de RLS de items, que ya
-- decía `estado <> 'oculto'` desde el principio (migración 001).
create or replace function buscar_items(q text, p_offset int default 0)
returns setof items as $$
  select *
  from items
  where estado <> 'oculto'
    and (
      search_vector @@ plainto_tsquery('spanish', q)
      or nombre % q
    )
  order by
    ts_rank(search_vector, plainto_tsquery('spanish', q)) desc,
    similarity(nombre, q) desc
  limit 10 offset p_offset;
$$ language sql stable;
