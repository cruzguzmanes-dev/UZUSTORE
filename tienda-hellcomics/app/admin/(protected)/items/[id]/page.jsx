"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import TagInput from "@/components/admin/TagInput";
import ImageUploader from "@/components/admin/ImageUploader";
import CategorySelect from "@/components/admin/CategorySelect";
import { slugify } from "@/lib/slugify";

const VACIO = {
  nombre: "",
  descripcion: "",
  precio: "",
  costo: "",
  stock: "0",
  estado: "activo",
  categoria_id: null,
  categoria_nueva: "",
  tags: [],
  imagenes: [],
};

export default function ItemFormPage() {
  const { id } = useParams();
  const esNuevo = id === "nuevo";
  const router = useRouter();

  const [form, setForm] = useState(VACIO);
  const [slugExistente, setSlugExistente] = useState(""); // solo en edición, el link ya fijo del item
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch("/api/admin/categorias")
      .then((r) => r.json())
      .then(setCategorias)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (esNuevo) return;
    fetch(`/api/admin/items/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          nombre: data.nombre || "",
          descripcion: data.descripcion || "",
          precio: String(data.precio ?? ""),
          costo: data.costo != null ? String(data.costo) : "",
          stock: String(data.stock ?? 0),
          estado: data.estado || "activo",
          categoria_id: data.categoria_id || null,
          categoria_nueva: "",
          tags: data.tags || [],
          imagenes: (data.imagenes || []).map((i) => i.url),
        });
        setSlugExistente(data.slug || "");
      })
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim() || !form.precio) {
      setError("Nombre y precio son requeridos");
      return;
    }
    if (form.imagenes.length === 0) {
      setError("Agrega al menos una foto");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(esNuevo ? "/api/admin/items" : `/api/admin/items/${id}`, {
        method: esNuevo ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando");
      router.push("/admin/items");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-white/40">Cargando...</p>;

  return (
    <form onSubmit={guardar} className="max-w-xl">
      <h1 className="mb-5 font-display text-lg font-extrabold text-white">
        {esNuevo ? "Nuevo item" : "Editar item"}
      </h1>

      <Campo label="Nombre *">
        <input
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        />
        <p className="mt-1.5 text-xs text-white/40">
          {esNuevo
            ? "Con este nombre se genera el link único del producto -- así es como lo va a encontrar la gente en Google y otros buscadores."
            : "El nombre lo puedes editar cuando quieras (ej. de \"Spiderman\" a \"Spiderman 4\"). Lo que NO cambia es el link de abajo -- se queda tal cual como en la creación, así nunca se rompe un link que ya compartiste."}
          {esNuevo && form.nombre.trim() && (
            <span className="mt-1 block font-mono text-white/50">{origin}/producto/{slugify(form.nombre) || "..."}</span>
          )}
          {!esNuevo && slugExistente && (
            <span className="mt-2 block">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand">
                Este es el link de este producto
              </span>
              <span className="font-mono text-brand">{origin}/producto/{slugExistente}</span>
            </span>
          )}
        </p>
      </Campo>

      <Campo label="Descripción">
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          rows={4}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
        />
      </Campo>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Campo label="Precio *">
          <input
            type="number" step="0.01" min="0"
            value={form.precio}
            onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
          />
        </Campo>
        <Campo label="Stock">
          <input
            type="number" min="0"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand"
          />
        </Campo>
      </div>

      <Campo label="Costo (opcional)">
        <input
          type="number" step="0.01" min="0"
          value={form.costo}
          onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
          placeholder="Solo tú lo ves -- para calcular ganancia más adelante"
          className="w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-brand"
        />
      </Campo>

      <Campo label="Categoría">
        <CategorySelect
          categorias={categorias}
          categoriaId={form.categoria_id}
          categoriaNueva={form.categoria_nueva}
          onChange={({ categoria_id, categoria_nueva }) => setForm((f) => ({ ...f, categoria_id, categoria_nueva }))}
        />
      </Campo>

      <Campo label="Tags">
        <TagInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
      </Campo>

      <Campo label="Estado">
        <select
          value={form.estado}
          onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none"
        >
          <option value="activo">Activo</option>
          <option value="agotado">Agotado</option>
          <option value="oculto">Oculto (no aparece en el catálogo)</option>
        </select>
      </Campo>

      <Campo label="Fotos *">
        <ImageUploader value={form.imagenes} onChange={(imagenes) => setForm((f) => ({ ...f, imagenes }))} />
      </Campo>

      {error && <p className="mb-4 text-sm text-red-400">⚠ {error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-lg bg-brand px-6 py-2.5 font-display font-bold text-white disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar →"}
      </button>
    </form>
  );
}

function Campo({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">{label}</label>
      {children}
    </div>
  );
}
