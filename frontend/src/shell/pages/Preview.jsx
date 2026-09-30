import { useParams, Link } from "react-router-dom";
import { useMachine } from "@xstate/react";
import { Loader2, ArrowLeft, Trash2, Pencil, Pin } from "lucide-react";
import { previewMachine, selectMatchTokens, selectAccent, selectRegrouping } from "@/core/machines/previewMachine";
import { useServices, useShellEffects } from "@/shell/providers";
import CVCorporate from "@/shell/components/CVCorporate";
import CVStartup from "@/shell/components/CVStartup";
import LetterTemplate from "@/shell/components/LetterTemplate";
import FullEditor from "@/shell/components/FullEditor";
import AtsCheckPanel from "@/shell/components/AtsCheckPanel";
import { PreviewSidebar, PreviewToolbar } from "@/shell/components/PreviewPanels";

export default function Preview() {
  const { id } = useParams();
  const services = useServices();
  const [snap, send, actor] = useMachine(previewMachine, { input: { services, id } });
  useShellEffects(actor);

  const { data, tab, editing, highlight, pdfLayout, atsOpen } = snap.context;
  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex items-center gap-3 text-zinc-500" data-testid="preview-loading">
        {snap.matches("failed") ? snap.context.error : <><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</>}
      </div>
    );
  }

  const matchTokens = selectMatchTokens(snap);
  const accent = selectAccent(snap);
  const CVView = data.template === "startup" ? CVStartup : CVCorporate;

  return (
    <div className="max-w-[1500px] mx-auto px-6 sm:px-8 lg:px-12 py-8 no-print">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="brut-btn brut-btn-ghost !py-2 !px-3" data-testid="back-to-create"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">{data.position} <span className="text-zinc-400">·</span> {data.company}</h1>
            <p className="text-xs text-zinc-500 mt-1 font-mono">{new Date(data.created_at).toLocaleString("fr-FR")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => send({ type: "PIN_AS_BASE" })} className="brut-btn brut-btn-ghost" data-testid="pin-base-button" title="Sauvegarder comme CV de base pour les prochaines candidatures">
            <Pin className="w-4 h-4" /> CV de base
          </button>
          <button onClick={() => send({ type: "TOGGLE_EDIT" })} className={`brut-btn ${editing ? "brut-btn-yellow" : "brut-btn-ghost"}`} data-testid="toggle-edit-button">
            <Pencil className="w-4 h-4" /> {editing ? "Enregistrer" : "Éditer"}
          </button>
          <button onClick={() => send({ type: "DELETE" })} className="brut-btn brut-btn-ghost" data-testid="delete-generation-button"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PreviewSidebar data={data} send={send} />
        <main className="lg:col-span-9">
          <PreviewToolbar tab={tab} highlight={highlight} pdfLayout={pdfLayout} canHighlight={matchTokens.size > 0} send={send} />
          {editing && <FullEditor cv={data.cv} letter={data.letter} tab={tab} send={send} regrouping={selectRegrouping(snap)} />}
          <div className="bg-zinc-100 rounded-lg p-4 border-2 border-black overflow-auto" data-testid="preview-stage">
            <div className="mx-auto" style={{ width: "210mm" }}>
              <div style={{ display: tab === "cv" ? "block" : "none" }}>
                <CVView cv={data.cv} photo={data.photo_data_url} accent={accent} highlight={highlight} matchTokens={matchTokens} />
              </div>
              <div style={{ display: tab === "letter" ? "block" : "none" }}>
                <LetterTemplate letter={data.letter} sender={data.cv} recipientCompany={data.company} />
              </div>
            </div>
          </div>
        </main>
      </div>
      {atsOpen && <AtsCheckPanel generationId={id} onClose={() => send({ type: "CLOSE_ATS" })} />}
    </div>
  );
}
