import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        await api.post(
          "/auth/process-session",
          null,
          { headers: { "X-Session-ID": sessionId }, withCredentials: true },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
        await refresh();
        // Clean up the URL fragment and land on the wizard.
        window.history.replaceState(null, "", "/");
        navigate("/", { replace: true });
      } catch (e) {
        console.error("Auth callback failed", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500" data-testid="auth-callback">
      <Loader2 className="w-5 h-5 animate-spin mr-3" /> Connexion en cours…
    </div>
  );
}
