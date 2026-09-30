import "@/index.css";
import { useMemo } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { buildServices } from "@/infrastructure/buildServices";
import { ShellProviders } from "@/shell/providers";
import Header from "@/shell/components/Header";
import ProtectedRoute from "@/shell/components/ProtectedRoute";
import Wizard from "@/shell/pages/Wizard";
import History from "@/shell/pages/History";
import Preview from "@/shell/pages/Preview";
import Login from "@/shell/pages/Login";
import AuthCallback from "@/shell/pages/AuthCallback";

const guarded = (page) => (
  <ProtectedRoute>
    <Header />
    {page}
  </ProtectedRoute>
);

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={guarded(<Wizard />)} />
      <Route path="/history" element={guarded(<History />)} />
      <Route path="/preview/:id" element={guarded(<Preview />)} />
    </Routes>
  );
}

export default function App() {
  const services = useMemo(buildServices, []);
  return (
    <BrowserRouter>
      <ShellProviders services={services}>
        <div className="min-h-screen dot-grid">
          <AppRouter />
        </div>
        <Toaster position="top-right" richColors />
      </ShellProviders>
    </BrowserRouter>
  );
}
