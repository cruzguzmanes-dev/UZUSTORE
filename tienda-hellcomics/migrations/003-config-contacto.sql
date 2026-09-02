-- Datos de contacto para el footer del sitio (dirección, redes sociales).
-- Todo opcional -- si queda vacío, el footer simplemente no muestra ese ícono/dato.

alter table config
  add column if not exists direccion text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

update config set
  direccion = 'Av. Universidad 790, sótano 1, Local 6, Ciudad de México, CDMX, 03310',
  instagram_url = 'https://www.instagram.com/hell_comics_mexico',
  facebook_url = 'https://www.facebook.com/share/1JVdNG821W/'
where id = 1;
