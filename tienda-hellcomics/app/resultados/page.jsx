import Header from "@/components/Header";
import ResultsList from "@/components/ResultsList";

export default function ResultadosPage({ searchParams }) {
  const q = searchParams?.q || "";
  const categoria = searchParams?.categoria || "";

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-white">
          {q ? `Resultados para "${q}"` : categoria ? "Categoría" : "Todo el catálogo"}
        </h1>
        <ResultsList q={q} categoria={categoria} />
      </main>
    </div>
  );
}
