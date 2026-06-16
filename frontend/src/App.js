import "@/index.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import Wizard from "@/pages/Wizard";
import History from "@/pages/History";
import Preview from "@/pages/Preview";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import { AuthProvider } from "@/context/AuthContext";

function AppRouter() {
  const location = useLocation();
  // Detect session_id during render to prevent race with global auth checks.
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Wizard />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <History />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/preview/:id"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Preview />
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen dot-grid">
          <AppRouter />
        </div>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
