import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import Wizard from "@/pages/Wizard";
import History from "@/pages/History";
import Preview from "@/pages/Preview";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen dot-grid">
        <Header />
        <Routes>
          <Route path="/" element={<Wizard />} />
          <Route path="/history" element={<History />} />
          <Route path="/preview/:id" element={<Preview />} />
        </Routes>
      </div>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}
