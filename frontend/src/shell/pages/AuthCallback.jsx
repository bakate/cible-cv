import { Loader2 } from "lucide-react";

/** Pure placeholder: the auth machine performs the session exchange and navigates. */
export default function AuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500" data-testid="auth-callback">
      <Loader2 className="w-5 h-5 animate-spin mr-3" /> Connexion en cours…
    </div>
  );
}
