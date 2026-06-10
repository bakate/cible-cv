import { Link, useLocation } from "react-router-dom";
import { FileText, History, Sparkles } from "lucide-react";

export default function Header() {
  const { pathname } = useLocation();
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b-2 border-black"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
          <div className="w-9 h-9 rounded-md border-2 border-black bg-[#FF3E1A] flex items-center justify-center shadow-[3px_3px_0_0_#0A0A0A]">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl">Cible<span className="text-[#FF3E1A]">CV</span></span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            data-testid="nav-create"
            className={`px-3 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-colors ${pathname === "/" ? "bg-black text-white" : "hover:bg-zinc-100"}`}
          >
            <FileText className="w-4 h-4" /> Créer
          </Link>
          <Link
            to="/history"
            data-testid="nav-history"
            className={`px-3 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-colors ${pathname.startsWith("/history") ? "bg-black text-white" : "hover:bg-zinc-100"}`}
          >
            <History className="w-4 h-4" /> Historique
          </Link>
        </nav>
      </div>
    </header>
  );
}
