/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link2, FileUp, PenLine, Loader2, ArrowRight, ArrowLeft, Image as ImageIcon, Sparkles, X } from "lucide-react";
import Stepper from "../components/Stepper";
import FileDrop from "../components/FileDrop";
import { parsePdf, parseUrl, generate } from "../lib/api";

const PROFILE_MODES = [
  { key: "pdf", label: "CV / Profil PDF", icon: FileUp, hint: "PDF, DOCX ou export LinkedIn" },
  { key: "linkedin", label: "URL LinkedIn", icon: Link2, hint: "Tentative d'extraction auto" },
  { key: "manual", label: "Saisie manuelle", icon: PenLine, hint: "Collez vos infos brutes" },
];

const JOB_MODES = [
  { key: "url", label: "URL d'annonce", icon: Link2, hint: "On essaie d'extraire automatiquement" },
  { key: "paste", label: "Texte collé", icon: PenLine, hint: "Collez le contenu" },
  { key: "file", label: "Fichier PDF/DOCX", icon: FileUp, hint: "Annonce téléchargée" },
];

export default function Wizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profileMode, setProfileMode] = useState("pdf");
  const [jobMode, setJobMode] = useState("paste");
  const [profileText, setProfileText] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [manualProfile, setManualProfile] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [jobFile, setJobFile] = useState(null);
  const [template, setTemplate] = useState("corporate");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePhoto = (file) => {
    if (!file) { setPhoto(""); return; }
    const r = new FileReader();
    r.onload = (e) => setPhoto(e.target.result);
    r.readAsDataURL(file);
  };

  const resolveProfile = async () => {
    if (profileMode === "pdf") {
      if (!profileFile) throw new Error("Importez un fichier de profil");
      const res = await parsePdf(profileFile);
      return res.text;
    }
    if (profileMode === "linkedin") {
      if (!linkedinUrl) throw new Error("Saisissez une URL LinkedIn");
      try {
        const res = await parseUrl(linkedinUrl);
        return res.text;
      } catch (e) {
        throw new Error("LinkedIn bloque l'extraction. Utilisez l'export PDF ou la saisie manuelle.");
      }
    }
    if (!manualProfile.trim()) throw new Error("Saisissez vos informations");
    return manualProfile;
  };

  const resolveJob = async () => {
    if (jobMode === "url") {
      if (!jobUrl) throw new Error("Saisissez une URL d'annonce");
      const res = await parseUrl(jobUrl);
      return res.text;
    }
    if (jobMode === "file") {
      if (!jobFile) throw new Error("Importez un fichier d'annonce");
      const res = await parsePdf(jobFile);
      return res.text;
    }
    if (!jobText.trim()) throw new Error("Collez le contenu de l'annonce");
    return jobText;
  };

  const handleNext = async () => {
    try {
      setBusy(true);
      if (step === 1) {
        const t = await resolveProfile();
        setProfileText(t);
        toast.success("Profil prêt", { description: `${t.length} caractères extraits` });
        setStep(2);
      } else if (step === 2) {
        const t = await resolveJob();
        setJobText(t);
        toast.success("Annonce prête", { description: `${t.length} caractères extraits` });
        setStep(3);
      } else if (step === 3) {
        toast.message("Génération en cours…", { description: "Claude analyse votre profil et l'offre" });
        const result = await generate({
          profile_text: profileText,
          job_text: jobText,
          template,
          photo_data_url: photo || null,
        });
        toast.success("Documents générés !");
        navigate(`/preview/${result.id}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">
            Génère ton CV.<br />
            <span className="text-[#FF3E1A]">En 4 étapes.</span>
          </h1>
          <p className="mt-3 text-zinc-600 max-w-xl">
            Importe ton profil, colle une offre, choisis ton style. On adapte tout — sans rien inventer.
          </p>
        </div>
        <Stepper current={step} />
      </div>

      {step === 1 && (
        <section className="brut-card-flat p-6 sm:p-10" data-testid="step-1-content">
          <h2 className="font-display text-2xl sm:text-3xl mb-2">1. Ton profil</h2>
          <p className="text-sm text-zinc-600 mb-6">D'où viennent tes infos ?</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {PROFILE_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setProfileMode(m.key)}
                data-testid={`profile-mode-${m.key}`}
                className={`text-left p-5 rounded-lg border-2 border-black transition-all ${profileMode === m.key ? "bg-[#FFEB3B] shadow-[4px_4px_0_0_#0A0A0A]" : "bg-white hover:bg-zinc-50"}`}
              >
                <m.icon className="w-5 h-5 mb-2" strokeWidth={2.5} />
                <div className="font-bold">{m.label}</div>
                <div className="text-xs text-zinc-600 mt-1">{m.hint}</div>
              </button>
            ))}
          </div>

          {profileMode === "pdf" && (
            <FileDrop
              onFile={setProfileFile}
              testId="profile-file-drop"
              label="Glissez votre CV ou export LinkedIn"
            />
          )}

          {profileMode === "linkedin" && (
            <div>
              <input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/votre-profil"
                className="brut-input"
                data-testid="linkedin-url-input"
              />
              <p className="text-xs text-zinc-500 mt-2">⚠️ LinkedIn bloque souvent l'extraction. Si ça échoue, utilise l'export PDF du profil ou la saisie manuelle.</p>
            </div>
          )}

          {profileMode === "manual" && (
            <textarea
              value={manualProfile}
              onChange={(e) => setManualProfile(e.target.value)}
              rows={10}
              placeholder="Nom, contact, expériences, formations, compétences…"
              className="brut-input"
              data-testid="manual-profile-input"
            />
          )}

          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0])}
                data-testid="photo-input"
              />
              <span className="brut-btn brut-btn-ghost">
                <ImageIcon className="w-4 h-4" /> {photo ? "Changer la photo" : "Photo de profil (optionnel)"}
              </span>
            </label>
            {photo && (
              <div className="flex items-center gap-2" data-testid="photo-preview-wrap">
                <img src={photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-black" />
                <button onClick={() => setPhoto("")} className="text-xs text-zinc-500 flex items-center gap-1 hover:text-black" data-testid="photo-remove">
                  <X className="w-3 h-3" /> retirer
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="brut-card-flat p-6 sm:p-10" data-testid="step-2-content">
          <h2 className="font-display text-2xl sm:text-3xl mb-2">2. L'offre d'emploi</h2>
          <p className="text-sm text-zinc-600 mb-6">Donne-nous la cible.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {JOB_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setJobMode(m.key)}
                data-testid={`job-mode-${m.key}`}
                className={`text-left p-5 rounded-lg border-2 border-black transition-all ${jobMode === m.key ? "bg-[#FFEB3B] shadow-[4px_4px_0_0_#0A0A0A]" : "bg-white hover:bg-zinc-50"}`}
              >
                <m.icon className="w-5 h-5 mb-2" strokeWidth={2.5} />
                <div className="font-bold">{m.label}</div>
                <div className="text-xs text-zinc-600 mt-1">{m.hint}</div>
              </button>
            ))}
          </div>

          {jobMode === "url" && (
            <input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://… (Welcome to the Jungle, LinkedIn, Indeed…)"
              className="brut-input"
              data-testid="job-url-input"
            />
          )}
          {jobMode === "paste" && (
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              rows={12}
              placeholder="Collez le texte de l'annonce ici…"
              className="brut-input"
              data-testid="job-text-input"
            />
          )}
          {jobMode === "file" && (
            <FileDrop onFile={setJobFile} testId="job-file-drop" label="Glissez l'annonce (PDF / DOCX)" />
          )}
        </section>
      )}

      {step === 3 && (
        <section className="brut-card-flat p-6 sm:p-10" data-testid="step-3-content">
          <h2 className="font-display text-2xl sm:text-3xl mb-2">3. Choix du template</h2>
          <p className="text-sm text-zinc-600 mb-6">Sélectionne un style — modifiable plus tard.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "corporate", title: "Corporate moderne", desc: "Sobre, structuré, parfait pour les rôles cadres et secteurs traditionnels.", accent: "bg-white" },
              { key: "startup", title: "Startup / Tech", desc: "Dynamique, contrasté, idéal pour scale-ups, produits, dev.", accent: "bg-[#0A0A0A] text-white" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTemplate(t.key)}
                data-testid={`template-${t.key}`}
                className={`text-left rounded-lg border-2 border-black overflow-hidden transition-all ${template === t.key ? "shadow-[6px_6px_0_0_#0A0A0A] -translate-y-1" : "shadow-[2px_2px_0_0_#0A0A0A]"}`}
              >
                <div className={`h-32 ${t.accent} border-b-2 border-black flex items-center justify-center`}>
                  <Sparkles className={`w-8 h-8 ${t.key === "startup" ? "text-[#FF3E1A]" : "text-black"}`} strokeWidth={2.5} />
                </div>
                <div className="p-5 bg-white">
                  <div className="font-bold text-lg">{t.title}</div>
                  <div className="text-sm text-zinc-600 mt-1">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-lg bg-[#E8F5E9] border-2 border-black">
            <p className="text-sm">
              <span className="font-bold">Récap :</span> {profileText.length} car. de profil, {jobText.length} car. d'annonce, template <span className="font-bold">{template}</span>.
            </p>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || busy}
          className="brut-btn brut-btn-ghost"
          data-testid="wizard-back-button"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button
          onClick={handleNext}
          disabled={busy}
          className="brut-btn"
          data-testid="wizard-next-button"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {step === 3 ? "Générer mon CV" : "Suivant"}
        </button>
      </div>
    </div>
  );
}
