/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { X, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Lightbulb } from "lucide-react";
import { atsCheck } from "../lib/api";

const verdictStyles = {
  excellent: "bg-[#E8F5E9] text-emerald-900 border-emerald-700",
  bon: "bg-[#FFEB3B] text-zinc-900 border-zinc-900",
  moyen: "bg-orange-100 text-orange-900 border-orange-600",
  faible: "bg-red-100 text-red-900 border-red-600",
};

const SECTION_LABELS = {
  summary: "Profil",
  experiences: "Expériences",
  education: "Formation",
  skills: "Compétences",
  languages: "Langues",
  contact: "Contact",
};

export default function AtsCheckPanel({ generationId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    atsCheck({ generation_id: generationId })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.detail || "Échec de l'analyse");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [generationId]);

  const score = data?.score ?? 0;
  const verdict = (data?.verdict || "moyen").toLowerCase();
  const vClass = verdictStyles[verdict] || verdictStyles.moyen;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print"
      onClick={onClose}
      data-testid="ats-modal-overlay"
    >
      <div
        className="brut-card-flat max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="ats-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md border-2 border-black bg-[#FFEB3B] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <h2 className="font-display text-2xl">Audit ATS</h2>
          </div>
          <button
            onClick={onClose}
            className="brut-btn brut-btn-ghost !py-1.5 !px-2"
            data-testid="ats-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="py-12 flex items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Claude analyse ton CV vs l'offre…
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-600 rounded-md text-red-900 text-sm">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-5">
            <div className={`p-5 rounded-lg border-2 ${vClass}`} data-testid="ats-score">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Score ATS</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-display text-6xl leading-none">{score}</span>
                <span className="font-bold text-xl opacity-80">/100</span>
                <span className="ml-auto text-sm font-bold uppercase tracking-wide">{verdict}</span>
              </div>
              <div className="mt-3 h-2 w-full bg-white/40 rounded-full overflow-hidden border border-current">
                <div className="h-full bg-current" style={{ width: `${score}%` }} />
              </div>
            </div>

            {data.keywords_present?.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Mots-clés OK ({data.keywords_present.length})</div>
                <div className="flex flex-wrap gap-1.5" data-testid="ats-keywords-present">
                  {data.keywords_present.map((k, i) => (
                    <span key={`p-${i}`} className="chip chip-mint">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {data.keywords_missing?.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-700 mb-2">À ajouter dans le CV ({data.keywords_missing.length})</div>
                <div className="flex flex-wrap gap-1.5" data-testid="ats-keywords-missing">
                  {data.keywords_missing.map((k, i) => (
                    <span key={`m-${i}`} className="chip" style={{ background: "#FEE2E2", borderColor: "#B91C1C" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Sections présentes</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="ats-sections">
                {Object.entries(data.sections_check || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-sm">
                    {v ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <span className={v ? "" : "text-red-600 font-bold"}>{SECTION_LABELS[k] || k}</span>
                  </div>
                ))}
              </div>
            </div>

            {data.format_warnings?.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-700 mb-2">Alertes format</div>
                <ul className="space-y-1.5 text-sm" data-testid="ats-warnings">
                  {data.format_warnings.map((w, i) => (
                    <li key={`w-${i}`} className="flex gap-2"><AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.recommendations?.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Recommandations</div>
                <ul className="space-y-1.5 text-sm" data-testid="ats-recommendations">
                  {data.recommendations.map((r, i) => (
                    <li key={`r-${i}`} className="flex gap-2"><Lightbulb className="w-4 h-4 text-[#FF3E1A] mt-0.5 shrink-0" />{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {(data.experience_match || data.skill_gap_analysis) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.experience_match && (
                  <div className="p-3 rounded-md border-2 border-black bg-zinc-50">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-1">Fit expérience</div>
                    <p className="text-sm">{data.experience_match}</p>
                  </div>
                )}
                {data.skill_gap_analysis && (
                  <div className="p-3 rounded-md border-2 border-black bg-zinc-50">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-1">Gap compétences</div>
                    <p className="text-sm">{data.skill_gap_analysis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
