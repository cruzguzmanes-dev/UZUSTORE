-- "Novedades" pasa a ser una sección más (antes estaba fija por código). Sigue siendo
-- automática (los items más nuevos), pero ahora el admin puede ocultar items puntuales
-- y moverla de posición junto con las demás secciones.
alter table secciones add column if not exists tipo text not null default 'manual'
  check (tipo in ('manual', 'novedades'));

-- Para una sección tipo 'novedades', su lista en seccion_items son los items EXCLUIDOS
-- (los que NO se muestran aunque sean nuevos). Solo puede haber una.
insert into secciones (nombre, orden, tipo)
select 'Novedades', coalesce((select max(orden) from secciones), -1) + 1, 'novedades'
where not exists (select 1 from secciones where tipo = 'novedades');
