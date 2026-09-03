// La PWA (instalable, modo app sin barra de Safari) es solo para el catálogo público --
// esto apaga esa parte específicamente para /admin (login + panel), sin tocar el resto
// del sitio. En Android no hace falta nada más: el manifest ya manda cualquier
// instalación a "/" (Home), sin importar desde qué página se instaló.
export const metadata = {
  appleWebApp: false,
};

export default function AdminLayout({ children }) {
  return children;
}
