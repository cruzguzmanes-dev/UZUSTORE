import React, { useState } from "react";

export default function UploadForm({ slug, onSuccess }) {
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foto || !precio || !costo) {
      setError("Foto, costo y precio son requeridos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Subir foto
      const formData = new FormData();
      formData.append("file", foto);

      const uploadRes = await fetch(
        `/api/distribuidor/upload?distribuidor=${slug}&filename=${foto.name}`,
        { method: "POST", body: foto }
      );
      if (!uploadRes.ok) throw new Error("Error subiendo foto");
      const uploadData = await uploadRes.json();
      const fotoUrl = uploadData.url;

      // 2. Crear artículo
      const articuloRes = await fetch("/api/distribuidor/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distribuidor: slug,
          nombre: nombre || null,
          foto_url: fotoUrl,
          costo_unitario: parseFloat(costo),
          precio_venta: parseFloat(precio),
          cantidad: parseInt(cantidad) || 1,
        }),
      });
      if (!articuloRes.ok) throw new Error("Error creando artículo");

      // Reset form
      setNombre("");
      setCosto("");
      setPrecio("");
      setCantidad("1");
      setFoto(null);
      setPreview("");
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%",
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "11px 14px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    outline: "none",
  };
  const lbl = {
    display: "block",
    fontSize: 10,
    fontFamily: "'Space Mono', monospace",
    color: "#888",
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: "uppercase",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>
          ➕ Agregar Artículo
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Nombre (opcional)</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pink Man"
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="1"
              style={inp}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Costo Unitario $</label>
            <input
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej: 150"
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Tu Precio $</label>
            <input
              type="number"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Ej: 300"
              style={inp}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Foto</label>
          <div style={{
            border: "2px dashed rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFotoChange({ target: { files: [file] } });
            }}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8 }} />
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  style={{ display: "none" }}
                  id="fotoInput"
                />
                <label htmlFor="fotoInput" style={{ cursor: "pointer" }}>
                  <p style={{ margin: "0 0 8px 0", color: "#888" }}>📸 Arrastra foto aquí o haz click</p>
                  <p style={{ margin: 0, color: "#666", fontSize: 12 }}>PNG, JPG, máx 5MB</p>
                </label>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255, 80, 80, 0.1)",
            border: "1px solid rgba(255, 80, 80, 0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#ff8080",
            fontSize: 12,
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#333" : "#FFE000",
            color: "#000",
            border: "none",
            borderRadius: 10,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Guardando..." : "Guardar Artículo →"}
        </button>
      </div>
    </form>
  );
}
