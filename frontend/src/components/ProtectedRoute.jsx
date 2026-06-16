import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500" data-testid="auth-loading">
        <Loader2 className="w-5 h-5 animate-spin mr-3" /> Chargement…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
