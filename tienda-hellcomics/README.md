# Hell Comics México — catálogo público

Ver el plan completo en `../` (sesión de Claude Code) para el contexto de negocio. Resumen técnico:

- Next.js (App Router), Tailwind CSS.
- Backend: Supabase (Postgres + Storage), pero **ninguna key de Supabase se manda al navegador** — todo pasa por rutas de servidor de Next.js (`app/api/**/route.js`).
- Deploy: proyecto de Vercel independiente, apuntando a esta carpeta (Root Directory = `tienda-hellcomics`).

## Puesta en marcha

1. **Crear un proyecto de Supabase** (puede ser nuevo, no tiene que ser el mismo que usa el dashboard principal, aunque puede vivir en la misma cuenta).
2. **Correr la migración**: pega el contenido de `migrations/001-catalogo-inicial.sql` en el SQL Editor de Supabase y ejecútalo. Esto crea las tablas, el buscador, y el bucket de Storage `items`.
3. **Generar el código de acceso del panel**:
   ```bash
   npm install
   npm run hash-code -- "el-codigo-que-quieras"
   ```
   Copia el hash que imprime y en Supabase corre:
   ```sql
   update config set acceso_admin_hash = 'PEGA_AQUI_EL_HASH' where id = 1;
   update config set whatsapp_numero = '5215512345678' where id = 1; -- tu número real
   ```
4. **Variables de entorno**: copia `.env.example` a `.env.local` y llena:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API en Supabase (la **service_role**, no la anon/publishable — esta nunca sale del servidor).
   - `SESSION_SECRET` — cualquier cadena larga y aleatoria (ej. `openssl rand -hex 32`).
   - `WHATSAPP_NUMERO_DEFAULT` / `SITE_URL` — opcionales, ver comentarios en el archivo.
5. **Correr local**:
   ```bash
   npm run dev
   ```
6. **Desplegar**: crear un proyecto nuevo en Vercel, importar el mismo repo de GitHub, y en la configuración poner **Root Directory = `tienda-hellcomics`**. Agregar las mismas variables de entorno del paso 4 en el proyecto de Vercel (Settings → Environment Variables). El dashboard principal (`uzustore.vercel.app`) sigue siendo un proyecto de Vercel aparte, sin tocar.

## Notas

- El campo `costo` de cada item es privado (para calcular ganancia más adelante) — no se expone en ninguna ruta pública.
- El botón "Me interesa" de cada producto abre WhatsApp con el nombre del producto y el link — no hay carrito ni pago en línea (a propósito, ver el plan).
- Multi-imagen ya funciona en el panel para cualquier item — es criterio de la tienda a cuáles items les vale la pena subir varias fotos.
