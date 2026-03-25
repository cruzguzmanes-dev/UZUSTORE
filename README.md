# UZUSTORE Dashboard Fiscal

Dashboard para monitorear ventas, costos, ganancias e impuestos de MercadoLibre.

## 🚀 Cómo subir a internet (paso a paso)

### Paso 1 — Sube el código a GitHub

1. Ve a **github.com** → Click en **"New repository"**
2. Nombre: `uzustore-dashboard` → Click **"Create repository"**
3. En la página del repo, click en **"uploading an existing file"**
4. Sube TODOS los archivos de esta carpeta manteniendo la estructura:
   ```
   api/token.js
   src/main.jsx
   src/App.jsx
   index.html
   package.json
   vite.config.js
   ```
5. Click **"Commit changes"**

### Paso 2 — Despliega en Vercel (gratis)

1. Ve a **vercel.com** → Regístrate con tu cuenta de GitHub
2. Click **"New Project"**
3. Selecciona tu repositorio `uzustore-dashboard`
4. Vercel detecta automáticamente que es Vite → Click **"Deploy"**
5. En ~2 minutos tendrás una URL tipo: `uzustore-dashboard.vercel.app`

### Paso 3 — Actualiza el Redirect URI en MercadoLibre

1. Ve a developers.mercadolibre.com.mx → Tu app → Editar
2. Agrega tu URL de Vercel al Redirect URI:
   `https://uzustore-dashboard.vercel.app`
3. Guarda los cambios

### ✅ Listo

Abre tu URL de Vercel, ingresa tu App ID y Secret Key, y el dashboard se conecta solo.

## 📁 Estructura del proyecto

```
uzustore/
├── api/
│   └── token.js        ← Función serverless (resuelve el CORS)
├── src/
│   ├── main.jsx        ← Entrada de React
│   └── App.jsx         ← Dashboard completo
├── index.html
├── package.json
└── vite.config.js
```

## 🔒 Seguridad

- Las credenciales NO se almacenan en ningún servidor
- El Secret Key solo se usa momentáneamente para obtener el Access Token
- La función `api/token.js` actúa como proxy para evitar exponer credenciales en el navegador
