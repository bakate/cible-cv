/* eslint-disable react/no-unescaped-entities */
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/shell/providers";

export default function Login() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 dot-grid">
      <div className="brut-card-flat max-w-md w-full p-8 sm:p-10" data-testid="login-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-md border-2 border-black bg-[#FF3E1A] flex items-center justify-center shadow-[3px_3px_0_0_#0A0A0A]">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-3xl">Cible<span className="text-[#FF3E1A]">CV</span></span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mb-3 leading-tight">
          Génère ton CV.<br /><span className="text-[#FF3E1A]">Sur mesure.</span>
        </h1>
        <p className="text-sm text-zinc-600 mb-8">
          Connecte-toi avec ton compte Google pour créer des CV adaptés à chaque offre, suivre tes générations et garder un historique privé.
        </p>
        <button onClick={login} className="brut-btn w-full !justify-between" data-testid="google-login-button">
          <span>Se connecter avec Google</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-zinc-500 mt-6">
          En te connectant, tu acceptes que ton email et ton nom soient utilisés pour personnaliser ton expérience. Aucune donnée n'est partagée.
        </p>
      </div>
    </div>
  );
}
