import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Download, Copy, Loader2, FileText, Mail, Sparkles, ArrowLeft, Trash2, Pencil, Pin } from "lucide-react";
import CVCorporate from "../components/CVCorporate";
import CVStartup from "../components/CVStartup";
import LetterTemplate from "../components/LetterTemplate";
import FullEditor from "../components/FullEditor";
import { getGeneration, updateGeneration, deleteGeneration, saveBaseProfile } from "../lib/api";

export default function Preview() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("cv");
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cvRef = useRef(null);
  const letterRef = useRef(null);

  useEffect(() => {
    getGeneration(id).then(setData).catch((e) => toast.error(e?.response?.data?.detail || "Erreur"));
  }, [id]);

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex items-center gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
      </div>
    );
  }

  const setTemplate = async (tpl) => {
    setData({ ...data, template: tpl });
    try { await updateGeneration(id, { template: tpl }); } catch (e) { /* noop */ }
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

  const exportPdf = async (which) => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const source = which === "cv" ? cvRef.current : letterRef.current;
      if (!source) throw new Error("Élément introuvable");
      // Offscreen clone so we render even when tab is hidden.
      const clone = source.cloneNode(true);
      clone.style.display = "block";
      const holder = document.createElement("div");
      holder.style.position = "fixed";
      holder.style.left = "-10000px";
      holder.style.top = "0";
      holder.style.width = "210mm";
      holder.style.background = "#fff";
      holder.appendChild(clone);
      document.body.appendChild(holder);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
        });
        const pageWmm = 210;
        const pageHmm = 297;
        const imgWmm = pageWmm;
        const fullImgHmm = (canvas.height * imgWmm) / canvas.width;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        let imgX = 0;
        let imgY = 0;
        let imgW = imgWmm;
        let imgH = fullImgHmm;
        if (fullImgHmm <= pageHmm + 0.5) {
          // fits naturally
        } else if (fullImgHmm <= pageHmm * 1.15) {
          imgH = pageHmm; // slight anamorphic squish
        } else {
          const scale = pageHmm / fullImgHmm;
          imgW = imgWmm * scale;
          imgH = pageHmm;
          imgX = (pageWmm - imgW) / 2;
        }
        pdf.addImage(imgData, "JPEG", imgX, imgY, imgW, imgH);

        // Add clickable link annotations on top of the raster image.
        const cloneRect = clone.getBoundingClientRect();
        const linkEls = clone.querySelectorAll("[data-pdf-link]");
        const pxToMmX = imgW / cloneRect.width;
        const pxToMmY = imgH / cloneRect.height;
        linkEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          const url = el.getAttribute("data-pdf-link");
          if (!url) return;
          pdf.link(
            imgX + (r.left - cloneRect.left) * pxToMmX,
            imgY + (r.top - cloneRect.top) * pxToMmY,
            r.width * pxToMmX,
            r.height * pxToMmY,
            { url },
          );
        });
        const safeName = (data.cv.full_name || "candidat").replace(/\s+/g, "_");
        const filename = which === "cv"
          ? `CV-${safeName}-${data.company}.pdf`
          : `Lettre-${safeName}-${data.company}.pdf`;
        pdf.save(filename);
        toast.success("PDF exporté");
      } finally {
        document.body.removeChild(holder);
      }
    } catch (e) {
      console.error(e);
      toast.error("Export PDF échoué");
    } finally {
      setExporting(false);
    }
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
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => exportPdf(tab)}
                disabled={exporting}
                className="brut-btn"
                data-testid="export-pdf-button"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exporter PDF
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
                  ? <CVStartup cv={cv} photo={data.photo_data_url} accent={accent} />
                  : <CVCorporate cv={cv} photo={data.photo_data_url} accent={accent} />}
              </div>
              <div ref={letterRef} style={{ display: tab === "letter" ? "block" : "none" }}>
                <LetterTemplate letter={data.letter} sender={cv} recipientCompany={data.company} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
