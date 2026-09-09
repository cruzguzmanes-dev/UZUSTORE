import Link from "next/link";
import VisitTracker from "@/components/VisitTracker";
import { getConfigPublica } from "@/lib/config";
import { linkWhatsappContacto } from "@/lib/whatsapp";

export const revalidate = 60;

export const metadata = {
  title: "Hell Comics México — Nosotros",
  description: "Nuestras redes, cómo llegar y el catálogo, todo en un solo lugar.",
};

// Pensada para UN solo código QR (en vez de uno por red social en la tarjeta de
// presentación) -- reparte a catálogo, redes y ubicación desde aquí.
export default async function NosotrosPage() {
  const config = await getConfigPublica();
  const mapsUrl = config.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.direccion)}`
    : null;

  const externos = [
    config.instagram_url && { href: config.instagram_url, label: "Síguenos en Instagram", icon: <IconoInstagram /> },
    config.facebook_url && { href: config.facebook_url, label: "Síguenos en Facebook", icon: <IconoFacebook /> },
    config.tiktok_url && { href: config.tiktok_url, label: "Síguenos en TikTok", icon: <IconoTiktok /> },
    mapsUrl && { href: mapsUrl, label: "Cómo llegar", icon: <IconoMapa /> },
    config.whatsapp_numero && {
      href: linkWhatsappContacto(config.whatsapp_numero),
      label: "Escríbenos por WhatsApp",
      icon: <IconoContacto />,
    },
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <VisitTracker />

      <Link href="/" className="mb-1 font-display text-2xl font-extrabold tracking-tight text-white">
        <span className="bg-gradient-to-r from-brand-flame-start via-brand to-brand-flame-end bg-clip-text text-transparent">
          Hell Comics
        </span>{" "}
        México
      </Link>
      <p className="mb-8 text-sm text-white/40">Todo en un solo lugar</p>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl border border-brand bg-brand/10 px-5 py-4 text-white transition hover:bg-brand/20"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <IconoCatalogo />
          </span>
          <span className="font-semibold">Checa nuestro catálogo</span>
        </Link>

        {externos.map((e) => (
          <a
            key={e.label}
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-brand-surface px-5 py-4 text-white transition hover:border-brand"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand">
              {e.icon}
            </span>
            <span className="font-semibold">{e.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function IconoCatalogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function IconoTiktok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18a3 3 0 1 0 3 3V4h3a4 4 0 0 0 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoMapa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.3" />
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
