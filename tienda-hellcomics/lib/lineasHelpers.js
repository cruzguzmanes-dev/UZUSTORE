// Resuelve y valida un array de líneas {item_id, talla?, cantidad} (producto del
// catálogo) o {nombre, precio, cantidad} (línea libre, sin catálogo) contra la base de
// datos -- SIN escribir nada todavía. Se usa tanto en ventas combinadas como en
// apartados: mismo patrón de "todo o nada", si una línea falla se aborta antes de tocar
// la base de datos en vez de dejar la operación a medias.
export async function resolverLineas(db, lineasBody) {
  const resueltas = [];
  let subtotal = 0;

  for (const l of lineasBody || []) {
    const cantidad = Math.max(1, parseInt(l.cantidad, 10) || 1);

    if (!l.item_id) {
      const nombre = (l.nombre || "").trim();
      const precio = parseFloat(l.precio);
      if (!nombre) return { error: "Falta el nombre de un producto sin catálogo" };
      if (isNaN(precio) || precio < 0) return { error: `Precio inválido para "${nombre}"` };
      const totalLinea = precio * cantidad;
      subtotal += totalLinea;
      resueltas.push({ libre: true, nombre, precio, cantidad, totalLinea });
      continue;
    }

    const { data: item } = await db
      .from("items")
      .select("id, nombre, precio, stock, tiene_tallas")
      .eq("id", l.item_id)
      .maybeSingle();
    if (!item) return { error: "Uno de los productos ya no existe" };

    let talla = null;
    let variante = null;

    if (item.tiene_tallas) {
      talla = (l.talla || "").trim();
      if (!talla) return { error: `Elige una talla para "${item.nombre}"` };
      const { data: v } = await db
        .from("variantes")
        .select("id, stock")
        .eq("item_id", item.id)
        .eq("talla", talla)
        .maybeSingle();
      if (!v) return { error: `Talla inválida para "${item.nombre}"` };
      if (v.stock < cantidad) return { error: `Solo quedan ${v.stock} de "${item.nombre}" en talla ${talla}` };
      variante = v;
    } else if (item.stock < cantidad) {
      return { error: `Solo quedan ${item.stock} de "${item.nombre}"` };
    }

    const totalLinea = item.precio * cantidad;
    subtotal += totalLinea;
    resueltas.push({ item, cantidad, talla, variante, totalLinea });
  }

  return { resueltas, subtotal };
}

// Resta el stock de cada línea ya resuelta (después de crear el registro padre --
// grupo de venta o apartado). Las líneas libres no tienen stock que tocar.
export async function descontarStock(db, resueltas) {
  for (const r of resueltas) {
    if (r.libre) continue;
    let stockItem;
    if (r.variante) {
      await db.from("variantes").update({ stock: r.variante.stock - r.cantidad }).eq("id", r.variante.id);
      const { data: todas } = await db.from("variantes").select("stock").eq("item_id", r.item.id);
      stockItem = (todas || []).reduce((s, v) => s + v.stock, 0);
    } else {
      stockItem = r.item.stock - r.cantidad;
    }
    await db.from("items").update({ stock: stockItem }).eq("id", r.item.id);
  }
}

// Inverso de descontarStock -- regresa el stock de cada línea de un apartado cancelado.
// Recibe filas ya guardadas (apartado_lineas), no las "resueltas" en memoria.
export async function restaurarStock(db, lineas) {
  for (const l of lineas || []) {
    if (!l.item_id) continue; // línea libre, no había stock que restaurar
    const { data: item } = await db.from("items").select("id, stock, tiene_tallas").eq("id", l.item_id).maybeSingle();
    if (!item) continue;

    if (item.tiene_tallas && l.talla) {
      const { data: v } = await db
        .from("variantes")
        .select("id, stock")
        .eq("item_id", item.id)
        .eq("talla", l.talla)
        .maybeSingle();
      if (v) {
        await db.from("variantes").update({ stock: v.stock + l.cantidad }).eq("id", v.id);
        const { data: todas } = await db.from("variantes").select("stock").eq("item_id", item.id);
        await db
          .from("items")
          .update({ stock: (todas || []).reduce((s, x) => s + x.stock, 0) })
          .eq("id", item.id);
      }
    } else {
      await db.from("items").update({ stock: item.stock + l.cantidad }).eq("id", item.id);
    }
  }
}
