import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="border-b border-white/10 px-4 py-4 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-white">
          Hell Comics <span className="text-brand">México</span>
        </Link>
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
