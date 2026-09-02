export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // quita acentos tras normalizar NFD (ej. "é" -> "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Genera un slug único agregando -2, -3, ... si ya existe en `existentes`.
export function slugUnico(base, existentes) {
  const set = new Set(existentes);
  let slug = slugify(base) || "item";
  let n = 2;
  while (set.has(slug)) {
    slug = `${slugify(base)}-${n}`;
    n++;
  }
  return slug;
}
