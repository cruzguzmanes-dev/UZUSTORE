import Link from "next/link";
import SearchBar from "./SearchBar";
import VisitTracker from "./VisitTracker";

export default function Header() {
  return (
    <header className="border-b border-white/10 px-4 py-4 sm:px-8">
      <VisitTracker />
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-white">
          <span className="bg-gradient-to-r from-brand-flame-start via-brand to-brand-flame-end bg-clip-text text-transparent">
            Hell Comics
          </span>{" "}
          México
        </Link>
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
