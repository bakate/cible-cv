import { Download, Copy, FileText, Mail, Sparkles, Target, FileDown, ShieldCheck, Columns2, Square } from "lucide-react";

const Label = ({ children, className = "mb-2" }) => (
  <div className={`text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 ${className}`}>{children}</div>
);

const Chips = ({ items, chipClass, testId }) => (
  <div className="flex flex-wrap gap-1.5" data-testid={testId}>
    {items.map((k, i) => <span key={i} className={`chip ${chipClass}`}>{k}</span>)}
    {items.length === 0 && <span className="text-xs text-zinc-400">aucun</span>}
  </div>
);

export function PreviewSidebar({ data, send }) {
  const adp = data.adaptations || {};
  const matchScore = adp.match_score || 0;
  const tplBtn = (tpl, label) => (
    <button onClick={() => send({ type: "SET_TEMPLATE", template: tpl })} data-testid={`switch-${tpl}`} className={`flex-1 py-2 px-3 rounded-md border-2 border-black text-sm font-bold ${data.template === tpl ? "bg-black text-white" : "bg-white"}`}>{label}</button>
  );
  return (
    <aside className="lg:col-span-3 space-y-4">
      <div className="brut-card-flat p-5" data-testid="match-score-card">
        <Label className="">Score de match</Label>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-display text-5xl">{matchScore}</span>
          <span className="text-zinc-500 font-bold">/100</span>
        </div>
        <div className="mt-3 h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-black">
          <div className="h-full bg-[#FF3E1A]" style={{ width: `${matchScore}%` }} />
        </div>
      </div>
      <div className="brut-card-flat p-5">
        <Label>Mots-clés matchés</Label>
        <Chips items={adp.keywords_matched || []} chipClass="chip-mint" testId="keywords-matched" />
      </div>
      <div className="brut-card-flat p-5">
        <Label>Mots-clés ajoutés</Label>
        <Chips items={adp.keywords_added || []} chipClass="chip-lavender" testId="keywords-added" />
      </div>
      <div className="brut-card-flat p-5">
        <Label>Expériences mises en avant</Label>
        <ul className="text-xs space-y-2" data-testid="experiences-highlighted">
          {(adp.experiences_highlighted || []).map((e, i) => <li key={i} className="flex gap-2"><Sparkles className="w-3 h-3 text-[#FF3E1A] mt-0.5 shrink-0" />{e}</li>)}
        </ul>
      </div>
      <div className="brut-card-flat p-5">
        <Label className="mb-3">Template</Label>
        <div className="flex gap-2">{tplBtn("corporate", "Corporate")}{tplBtn("startup", "Startup")}</div>
      </div>
    </aside>
  );
}

export function PreviewToolbar({ tab, highlight, pdfLayout, canHighlight, send }) {
  const layoutBtn = (layout, Icon, label, title, extra = "") => (
    <button onClick={() => send({ type: "SET_PDF_LAYOUT", layout })} className={`px-2.5 py-2 text-xs font-bold flex items-center gap-1 ${extra} ${pdfLayout === layout ? "bg-black text-white" : "bg-white"}`} data-testid={`pdf-layout-${layout}`} title={title}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <button onClick={() => send({ type: "SET_TAB", tab: "cv" })} data-testid="tab-cv" className={`brut-btn ${tab === "cv" ? "" : "brut-btn-ghost"}`}><FileText className="w-4 h-4" /> CV</button>
      <button onClick={() => send({ type: "SET_TAB", tab: "letter" })} data-testid="tab-letter" className={`brut-btn ${tab === "letter" ? "" : "brut-btn-ghost"}`}><Mail className="w-4 h-4" /> Lettre</button>
      {tab === "cv" && canHighlight && (
        <button onClick={() => send({ type: "TOGGLE_HIGHLIGHT" })} className={`brut-btn ${highlight ? "brut-btn-yellow" : "brut-btn-ghost"}`} data-testid="toggle-highlight-button" title="Surligner les compétences qui matchent les mots-clés de l'offre">
          <Target className="w-4 h-4" /> {highlight ? "Surlignage actif" : "Surligner matchs"}
        </button>
      )}
      {tab === "cv" && (
        <button onClick={() => send({ type: "OPEN_ATS" })} className="brut-btn brut-btn-ghost" data-testid="ats-check-button" title="Auditer la compatibilité ATS de ce CV vs l'offre">
          <ShieldCheck className="w-4 h-4" /> ATS check
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {tab === "cv" && (
          <div className="flex border-2 border-black rounded-md overflow-hidden" data-testid="pdf-layout-toggle">
            {layoutBtn("single", Square, "1 col", "1 colonne — recommandé ATS")}
            {layoutBtn("two-col", Columns2, "2 cols", "2 colonnes — pour recruteurs humains", "border-l-2 border-black")}
          </div>
        )}
        <button onClick={() => send({ type: "EXPORT", format: "pdf" })} className="brut-btn" data-testid="export-pdf-button" title="PDF texte natif — extractable par les ATS">
          <Download className="w-4 h-4" /> PDF
        </button>
        <button onClick={() => send({ type: "EXPORT", format: "docx" })} className="brut-btn brut-btn-ghost" data-testid="export-docx-button" title="Exporter en Word (.docx) — format ATS-friendly et éditable">
          <FileDown className="w-4 h-4" /> DOCX
        </button>
        {tab === "letter" && (
          <button onClick={() => send({ type: "COPY_LETTER" })} className="brut-btn brut-btn-ghost" data-testid="copy-letter-button">
            <Copy className="w-4 h-4" /> Copier
          </button>
        )}
      </div>
    </div>
  );
}
