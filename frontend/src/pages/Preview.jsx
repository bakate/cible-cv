import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Download, Copy, Loader2, FileText, Mail, Sparkles, ArrowLeft, Trash2, Pencil, Pin, Target, FileDown, ShieldCheck, Columns2, Square } from "lucide-react";
import CVCorporate from "../components/CVCorporate";
import CVStartup from "../components/CVStartup";
import LetterTemplate from "../components/LetterTemplate";
import FullEditor from "../components/FullEditor";
import AtsCheckPanel from "../components/AtsCheckPanel";
import { getGeneration, updateGeneration, deleteGeneration, saveBaseProfile, exportCvDocxUrl, exportLetterDocxUrl, exportCvPdfUrl, exportLetterPdfUrl } from "../lib/api";

export default function Preview() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("cv");
  const [editing, setEditing] = useState(false);
  const cvRef = useRef(null);
  const [highlight, setHighlight] = useState(false);
  const [pdfLayout, setPdfLayout] = useState("single");
  const [atsOpen, setAtsOpen] = useState(false);
  const letterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getGeneration(id)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => toast.error(e?.response?.data?.detail || "Erreur"));
    return () => { cancelled = true; };
  }, [id]);

  const matchTokens = useMemo(() => {
    const adp = data?.adaptations || {};
    const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const tokenize = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
    const set = new Set();
    [...(adp.keywords_matched || []), ...(adp.keywords_added || [])].forEach((k) => {
      tokenize(k).forEach((t) => set.add(t));
    });
    return set;
  }, [data?.adaptations]);

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex items-center gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
      </div>
    );
  }

  const setTemplate = async (tpl) => {
    setData({ ...data, template: tpl });
    try {
      await updateGeneration(id, { template: tpl });
    } catch (e) {
      console.warn("Template update failed", e);
    }
  };

  const persistEdits = async () => {
    try {
      await updateGeneration(id, { cv: data.cv, letter: data.letter });
      toast.success("Modifications enregistrées");
      setEditing(false);
    } catch (e) {
      toast.error("Échec de la sauvegarde");
    }
  };

  const exportPdf = (which) => {
    const url = which === "cv" ? exportCvPdfUrl(id, pdfLayout) : exportLetterPdfUrl(id);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("PDF en cours de téléchargement");
  };

  const copyLetterText = async () => {
    const text = `${data.letter.subject ? data.letter.subject + "\n\n" : ""}${data.letter.recipient || ""}\n\n${data.letter.body}`;
    await navigator.clipboard.writeText(text);
    toast.success("Lettre copiée");
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette génération ?")) return;
    await deleteGeneration(id);
    toast.success("Supprimé");
    window.location.href = "/history";
  };

  const pinAsBase = async () => {
    try {
      await saveBaseProfile({
        profile_text: data.profile_text,
        cv: data.cv,
        photo_data_url: data.photo_data_url,
      });
      toast.success("CV de base mis à jour", { description: "Tu pourras le réutiliser à chaque nouvelle candidature." });
    } catch (e) {
      toast.error("Échec de la sauvegarde");
    }
  };

  const cv = data.cv || {};
  const adp = data.adaptations || {};
  const matchScore = adp.match_score || 0;
  const accent = cv.theme?.accent || "#FF3E1A";

  const downloadDocx = (kind) => {
    const url = kind === "cv" ? exportCvDocxUrl(id) : exportLetterDocxUrl(id);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("DOCX en cours de téléchargement");
  };

  return (
    <div className="max-w-[1500px] mx-auto px-6 sm:px-8 lg:px-12 py-8 no-print">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="brut-btn brut-btn-ghost !py-2 !px-3" data-testid="back-to-create">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">{data.position} <span className="text-zinc-400">·</span> {data.company}</h1>
            <p className="text-xs text-zinc-500 mt-1 font-mono">{new Date(data.created_at).toLocaleString("fr-FR")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={pinAsBase}
            className="brut-btn brut-btn-ghost"
            data-testid="pin-base-button"
            title="Sauvegarder comme CV de base pour les prochaines candidatures"
          >
            <Pin className="w-4 h-4" /> CV de base
          </button>
          <button
            onClick={() => editing ? persistEdits() : setEditing(true)}
            className={`brut-btn ${editing ? "brut-btn-yellow" : "brut-btn-ghost"}`}
            data-testid="toggle-edit-button"
          >
            <Pencil className="w-4 h-4" /> {editing ? "Enregistrer" : "Éditer"}
          </button>
          <button onClick={handleDelete} className="brut-btn brut-btn-ghost" data-testid="delete-generation-button">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar with adaptations */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="brut-card-flat p-5" data-testid="match-score-card">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Score de match</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display text-5xl">{matchScore}</span>
              <span className="text-zinc-500 font-bold">/100</span>
            </div>
            <div className="mt-3 h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-black">
              <div className="h-full bg-[#FF3E1A]" style={{ width: `${matchScore}%` }} />
            </div>
          </div>

          <div className="brut-card-flat p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">Mots-clés matchés</div>
            <div className="flex flex-wrap gap-1.5" data-testid="keywords-matched">
              {(adp.keywords_matched || []).map((k, i) => <span key={i} className="chip chip-mint">{k}</span>)}
              {(adp.keywords_matched || []).length === 0 && <span className="text-xs text-zinc-400">aucun</span>}
            </div>
          </div>

          <div className="brut-card-flat p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">Mots-clés ajoutés</div>
            <div className="flex flex-wrap gap-1.5" data-testid="keywords-added">
              {(adp.keywords_added || []).map((k, i) => <span key={i} className="chip chip-lavender">{k}</span>)}
              {(adp.keywords_added || []).length === 0 && <span className="text-xs text-zinc-400">aucun</span>}
            </div>
          </div>

          <div className="brut-card-flat p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">Expériences mises en avant</div>
            <ul className="text-xs space-y-2" data-testid="experiences-highlighted">
              {(adp.experiences_highlighted || []).map((e, i) => <li key={i} className="flex gap-2"><Sparkles className="w-3 h-3 text-[#FF3E1A] mt-0.5 shrink-0" />{e}</li>)}
            </ul>
          </div>

          <div className="brut-card-flat p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">Template</div>
            <div className="flex gap-2">
              <button onClick={() => setTemplate("corporate")} data-testid="switch-corporate" className={`flex-1 py-2 px-3 rounded-md border-2 border-black text-sm font-bold ${data.template === "corporate" ? "bg-black text-white" : "bg-white"}`}>Corporate</button>
              <button onClick={() => setTemplate("startup")} data-testid="switch-startup" className={`flex-1 py-2 px-3 rounded-md border-2 border-black text-sm font-bold ${data.template === "startup" ? "bg-black text-white" : "bg-white"}`}>Startup</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="lg:col-span-9">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => setTab("cv")} data-testid="tab-cv" className={`brut-btn ${tab === "cv" ? "" : "brut-btn-ghost"}`}><FileText className="w-4 h-4" /> CV</button>
            <button onClick={() => setTab("letter")} data-testid="tab-letter" className={`brut-btn ${tab === "letter" ? "" : "brut-btn-ghost"}`}><Mail className="w-4 h-4" /> Lettre</button>
            {tab === "cv" && matchTokens.size > 0 && (
              <button
                onClick={() => setHighlight((v) => !v)}
                className={`brut-btn ${highlight ? "brut-btn-yellow" : "brut-btn-ghost"}`}
                data-testid="toggle-highlight-button"
                title="Surligner les compétences qui matchent les mots-clés de l'offre"
              >
                <Target className="w-4 h-4" /> {highlight ? "Surlignage actif" : "Surligner matchs"}
              </button>
            )}
            {tab === "cv" && (
              <button
                onClick={() => setAtsOpen(true)}
                className="brut-btn brut-btn-ghost"
                data-testid="ats-check-button"
                title="Auditer la compatibilité ATS de ce CV vs l'offre"
              >
                <ShieldCheck className="w-4 h-4" /> ATS check
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {tab === "cv" && (
                <div className="flex border-2 border-black rounded-md overflow-hidden" data-testid="pdf-layout-toggle">
                  <button
                    onClick={() => setPdfLayout("single")}
                    className={`px-2.5 py-2 text-xs font-bold flex items-center gap-1 ${pdfLayout === "single" ? "bg-black text-white" : "bg-white"}`}
                    data-testid="pdf-layout-single"
                    title="1 colonne — recommandé ATS"
                  >
                    <Square className="w-3 h-3" /> 1 col
                  </button>
                  <button
                    onClick={() => setPdfLayout("two-col")}
                    className={`px-2.5 py-2 text-xs font-bold flex items-center gap-1 border-l-2 border-black ${pdfLayout === "two-col" ? "bg-black text-white" : "bg-white"}`}
                    data-testid="pdf-layout-two-col"
                    title="2 colonnes — pour recruteurs humains"
                  >
                    <Columns2 className="w-3 h-3" /> 2 cols
                  </button>
                </div>
              )}
              <button
                onClick={() => exportPdf(tab)}
                className="brut-btn"
                data-testid="export-pdf-button"
                title="PDF texte natif — extractable par les ATS"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => downloadDocx(tab)}
                className="brut-btn brut-btn-ghost"
                data-testid="export-docx-button"
                title="Exporter en Word (.docx) — format ATS-friendly et éditable"
              >
                <FileDown className="w-4 h-4" /> DOCX
              </button>
              {tab === "letter" && (
                <button onClick={copyLetterText} className="brut-btn brut-btn-ghost" data-testid="copy-letter-button">
                  <Copy className="w-4 h-4" /> Copier
                </button>
              )}
            </div>
          </div>

          {editing && (
            <FullEditor data={data} setData={setData} tab={tab} />
          )}

          <div className="bg-zinc-100 rounded-lg p-4 border-2 border-black overflow-auto" data-testid="preview-stage">
            <div className="mx-auto" style={{ width: "210mm" }}>
              <div ref={cvRef} style={{ display: tab === "cv" ? "block" : "none" }}>
                {data.template === "startup"
                  ? <CVStartup cv={cv} photo={data.photo_data_url} accent={accent} highlight={highlight} matchTokens={matchTokens} />
                  : <CVCorporate cv={cv} photo={data.photo_data_url} accent={accent} highlight={highlight} matchTokens={matchTokens} />}
              </div>
              <div ref={letterRef} style={{ display: tab === "letter" ? "block" : "none" }}>
                <LetterTemplate letter={data.letter} sender={cv} recipientCompany={data.company} />
              </div>
            </div>
          </div>
        </main>
      </div>
      {atsOpen && <AtsCheckPanel generationId={id} onClose={() => setAtsOpen(false)} />}
    </div>
  );
}
