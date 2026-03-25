import React, { useState } from "react";

const CSS = `
  .upload-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  @media (max-width: 320px) { .upload-grid-2 { grid-template-columns: 1fr; } }
  .upload-drop {
    border: 2px dashed rgba(255,255,255,0.15);
    border-radius: 10px; padding: 20px 16px;
    text-align: center; cursor: pointer;
    transition: border-color 0.2s;
  }
  .upload-drop:hover { border-color: rgba(255,224,0,0.4); }
  .upload-preview { max-height: 180px; max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; }
`;

const inp = {
  width: "100%",
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 16,
  fontFamily: "'Space Mono', monospace",
  outline: "none",
  boxSizing: "border-box",
};
const lbl = {
  display: "block",
  fontSize: 9,
  fontFamily: "'Space Mono', monospace",
  color: "#666",
  letterSpacing: 2,
  marginBottom: 6,
  textTransform: "uppercase",
};

function compressImage(file, maxSize = 400, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function UploadForm({ slug, onSuccess, modoPrecio = "venta" }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foto) {
      setError("La foto es requerida");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fotoBase64 = await compressImage(foto);

      const res = await fetch("/api/distribuidor/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distribuidor: slug,
          nombre: nombre || null,
          foto_url: fotoBase64,
          precio_venta: precio ? parseFloat(precio) : null,
          cantidad: parseInt(cantidad) || 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Error creando artículo");
      }

      setNombre(""); setPrecio(""); setCantidad("1");
      setFoto(null); setPreview("");
      setOpen(false);
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: "100%", background: "none", border: "none",
            padding: "16px 18px", display: "flex", justifyContent: "space-between",
            alignItems: "center", cursor: "pointer", color: "#fff",
          }}
        >
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>
            ➕ Agregar Artículo
          </span>
          <span style={{ color: "#666", fontSize: 18 }}>{open ? "−" : "+"}</span>
        </button>

        {open && (
          <form onSubmit={handleSubmit} style={{ padding: "0 18px 18px" }}>
            <div className="upload-grid-2">
              <div>
                <label style={lbl}>Nombre (opcional)</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Goku UI" style={inp} />
              </div>
              <div>
                <label style={lbl}>Cantidad</label>
                <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                  min="1" style={inp} />
              </div>
            </div>

            {modoPrecio === "venta" && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Tu Precio de Venta $ <span style={{ color: "#444", letterSpacing: 0, textTransform: "none" }}>(opcional)</span></label>
                <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)}
                  placeholder="Ej: 650" style={inp} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Foto</label>
              <div
                className="upload-drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFotoChange({ target: { files: [file] } });
                }}
              >
                {preview ? (
                  <div>
                    <img src={preview} alt="Preview" className="upload-preview" />
                    <button
                      type="button"
                      onClick={() => { setFoto(null); setPreview(""); }}
                      style={{ marginTop: 10, background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
                    >
                      Cambiar foto
                    </button>
                  </div>
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleFotoChange}
                      style={{ display: "none" }} id="fotoInput" />
                    <label htmlFor="fotoInput" style={{ cursor: "pointer", display: "block" }}>
                      <p style={{ margin: "0 0 6px 0", color: "#888", fontSize: 14 }}>📸 Toca para agregar foto</p>
                      <p style={{ margin: 0, color: "#555", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>PNG, JPG, máx 5MB</p>
                    </label>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
                borderRadius: 8, padding: "10px 14px", color: "#ff8080",
                fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 14,
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", background: loading ? "#333" : "#FFE000",
                color: "#000", border: "none", borderRadius: 10,
                padding: 15, fontSize: 15, fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Guardando..." : "Guardar Artículo →"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
