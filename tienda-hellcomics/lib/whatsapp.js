export function linkWhatsapp(numero, item, urlProducto, talla) {
  const num = String(numero || "").replace(/[^0-9]/g, "");
  const tallaTexto = talla ? ` (talla ${talla})` : "";
  const mensaje = `Hola! Me interesa: ${item.nombre}${tallaTexto}${urlProducto ? `\n${urlProducto}` : ""}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

// Contacto general (footer) -- no está ligado a un producto específico.
export function linkWhatsappContacto(numero) {
  const num = String(numero || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent("Hola! Tengo una pregunta sobre Hell Comics México.")}`;
}
