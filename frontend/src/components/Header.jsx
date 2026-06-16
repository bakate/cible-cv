import { Link, useLocation } from "react-router-dom";
import { FileText, History, Sparkles, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b-2 border-black"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
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
          {user && (
            <div className="ml-2 flex items-center gap-2" data-testid="user-menu">
              {user.role === "admin" && (
                <span className="hidden sm:inline-flex chip chip-yellow gap-1" data-testid="admin-badge">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-black"
                  data-testid="user-avatar"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-200 flex items-center justify-center text-xs font-bold">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={logout}
                className="brut-btn brut-btn-ghost !py-1.5 !px-2.5 text-xs"
                data-testid="logout-button"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quitter</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
