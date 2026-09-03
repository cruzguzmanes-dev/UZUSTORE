// agotado: si el item (o la talla elegida) ya no está disponible, el mensaje cambia de
// "me interesa" a preguntar por disponibilidad futura -- así el cliente no siente que
// está cerrada la puerta, y la tienda igual sabe que hay demanda de eso.
export function linkWhatsapp(numero, item, urlProducto, talla, agotado) {
  const num = String(numero || "").replace(/[^0-9]/g, "");
  const tallaTexto = talla ? ` (talla ${talla})` : "";
  const mensaje = agotado
    ? `Hola! ¿Volverán a tener disponibilidad de: ${item.nombre}${tallaTexto}?${urlProducto ? `\n${urlProducto}` : ""}`
    : `Hola! Me interesa: ${item.nombre}${tallaTexto}${urlProducto ? `\n${urlProducto}` : ""}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

// Contacto general (footer) -- no está ligado a un producto específico.
export function linkWhatsappContacto(numero) {
  const num = String(numero || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent("Hola! Tengo una pregunta sobre Hell Comics México.")}`;
}
