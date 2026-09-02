import { getConfigPublica } from "@/lib/config";
import { linkWhatsappContacto } from "@/lib/whatsapp";

// Discreto, a propósito -- solo se usa en el Home.
export default async function Footer() {
  const config = await getConfigPublica();
  const hayAlgo = config.direccion || config.instagram_url || config.facebook_url || config.whatsapp_numero;
  if (!hayAlgo) return null;

  return (
    <footer className="mt-16 border-t border-white/5 px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          {config.instagram_url && (
            <IconLink href={config.instagram_url} label="Instagram">
              <IconoInstagram />
            </IconLink>
          )}
          {config.facebook_url && (
            <IconLink href={config.facebook_url} label="Facebook">
              <IconoFacebook />
            </IconLink>
          )}
          {config.whatsapp_numero && (
            <IconLink href={linkWhatsappContacto(config.whatsapp_numero)} label="Contacto">
              <IconoContacto />
            </IconLink>
          )}
        </div>
        {config.direccion && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.direccion)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-sm text-xs text-white/30 transition hover:text-white/60"
          >
            {config.direccion}
          </a>
        )}
      </div>
    </footer>
  );
}

function IconLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="text-white/30 transition hover:text-brand"
    >
      {children}
    </a>
  );
}

function IconoInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconoFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H7v4h3v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

function IconoContacto() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}
