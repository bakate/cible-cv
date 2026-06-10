/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Inbox } from "lucide-react";
import { listGenerations } from "../lib/api";

export default function History() {
  const [items, setItems] = useState(null);
  useEffect(() => { listGenerations().then(setItems).catch(() => setItems([])); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-4xl sm:text-5xl">Historique</h1>
        <Link to="/" className="brut-btn" data-testid="create-new-button"><Plus className="w-4 h-4" /> Nouveau</Link>
      </div>

      {items === null && <p className="text-zinc-500">Chargement…</p>}
      {items && items.length === 0 && (
        <div className="brut-card-flat p-12 text-center" data-testid="empty-history">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
          <p className="font-bold mb-1">Aucune génération pour l'instant.</p>
          <p className="text-sm text-zinc-500 mb-6">Lance ta première et elle apparaîtra ici.</p>
          <Link to="/" className="brut-btn inline-flex"><Plus className="w-4 h-4" /> Créer mon premier CV</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="history-grid">
          {items.map((g) => (
            <Link
              key={g.id}
              to={`/preview/${g.id}`}
              className="brut-card p-6 block"
              data-testid={`history-card-${g.id}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-md bg-[#FFEB3B] border-2 border-black flex items-center justify-center">
                  <FileText className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className="chip chip-mint">{g.match_score || 0}/100</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mb-1">
                {new Date(g.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">{g.position}</h3>
              <p className="text-sm text-zinc-600">{g.company}</p>
              <div className="mt-4 text-xs uppercase tracking-widest font-bold text-zinc-400">
                {g.template === "startup" ? "Startup / Tech" : "Corporate moderne"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
