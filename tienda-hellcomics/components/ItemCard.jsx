import Image from "next/image";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export default function ItemCard({ item }) {
  const portada = item.imagenes?.[0]?.url;
  const agotado = item.estado === "agotado";

  return (
    <Link
      href={`/producto/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-brand-surface transition hover:border-brand/60"
    >
      <div className="relative aspect-[3/4] w-full bg-brand-surface2">
        {portada ? (
          <Image
            src={portada}
            alt={item.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">Sin foto</div>
        )}
        {agotado && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/80">
            Agotado
          </span>
        )}
        {item.categorias?.nombre && (
          <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
            {item.categorias.nombre}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-semibold text-white">{item.nombre}</div>
        <div className="mt-auto font-display text-base font-extrabold text-brand">{fmt(item.precio)}</div>
      </div>
    </Link>
  );
}
