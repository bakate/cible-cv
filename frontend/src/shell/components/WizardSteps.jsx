/* eslint-disable react/no-unescaped-entities */
import { Link2, FileUp, PenLine, Image as ImageIcon, Sparkles, X, Pin, Trash2 } from "lucide-react";
import FileDrop from "./FileDrop";

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

const TEMPLATES = [
  { key: "corporate", title: "Corporate moderne", desc: "Sobre, structuré, parfait pour les rôles cadres et secteurs traditionnels.", accent: "bg-white" },
  { key: "startup", title: "Startup / Tech", desc: "Dynamique, contrasté, idéal pour scale-ups, produits, dev.", accent: "bg-[#0A0A0A] text-white" },
];

const ModeGrid = ({ modes, current, onPick, prefix }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    {modes.map((m) => (
      <button
        key={m.key}
        onClick={() => onPick(m.key)}
        data-testid={`${prefix}-${m.key}`}
        className={`text-left p-5 rounded-lg border-2 border-black transition-all ${current === m.key ? "bg-[#FFEB3B] shadow-[4px_4px_0_0_#0A0A0A]" : "bg-white hover:bg-zinc-50"}`}
      >
        <m.icon className="w-5 h-5 mb-2" strokeWidth={2.5} />
        <div className="font-bold">{m.label}</div>
        <div className="text-xs text-zinc-600 mt-1">{m.hint}</div>
      </button>
    ))}
  </div>
);

const BaseProfileBanner = ({ baseProfile, send }) => (
  <div className="mb-6 p-5 rounded-lg border-2 border-black bg-[#FFEB3B] flex items-center justify-between gap-4 flex-wrap" data-testid="base-profile-banner">
    <div className="flex items-center gap-3 min-w-0">
      <Pin className="w-5 h-5 shrink-0" strokeWidth={2.5} />
      <div className="min-w-0">
        <div className="font-bold">CV de base disponible</div>
        <div className="text-xs text-zinc-700">Mis à jour le {new Date(baseProfile.updated_at).toLocaleString("fr-FR")}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => send({ type: "USE_BASE_PROFILE" })} className="brut-btn" data-testid="use-base-profile-button">Utiliser ce CV</button>
      <button onClick={() => send({ type: "FORGET_BASE_PROFILE" })} className="brut-btn brut-btn-ghost !py-2 !px-3" data-testid="forget-base-profile-button" aria-label="Supprimer le CV de base">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const PhotoPicker = ({ photo, send }) => (
  <div className="mt-6 flex items-center gap-4 flex-wrap">
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="file" accept="image/*" className="hidden" onChange={(e) => send({ type: "SET_PHOTO_FILE", file: e.target.files?.[0] || null })} data-testid="photo-input" />
      <span className="brut-btn brut-btn-ghost">
        <ImageIcon className="w-4 h-4" /> {photo ? "Changer la photo" : "Photo de profil (optionnel)"}
      </span>
    </label>
    {photo && (
      <div className="flex items-center gap-2" data-testid="photo-preview-wrap">
        <img src={photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-black" />
        <button onClick={() => send({ type: "CLEAR_PHOTO" })} className="text-xs text-zinc-500 flex items-center gap-1 hover:text-black" data-testid="photo-remove">
          <X className="w-3 h-3" /> retirer
        </button>
      </div>
    )}
  </div>
);

export function ProfileStep({ ctx, send }) {
  return (
    <section className="brut-card-flat p-6 sm:p-10" data-testid="step-1-content">
      <h2 className="font-display text-2xl sm:text-3xl mb-2">1. Ton profil</h2>
      <p className="text-sm text-zinc-600 mb-6">D'où viennent tes infos ?</p>
      {ctx.baseProfile && <BaseProfileBanner baseProfile={ctx.baseProfile} send={send} />}
      <ModeGrid modes={PROFILE_MODES} current={ctx.profileMode} prefix="profile-mode" onPick={(mode) => send({ type: "SET_PROFILE_MODE", mode })} />

      {ctx.profileMode === "pdf" && (
        <FileDrop onFile={(file) => send({ type: "SET_PROFILE_FILE", file })} testId="profile-file-drop" label="Glissez votre CV ou export LinkedIn" />
      )}
      {ctx.profileMode === "linkedin" && (
        <div>
          <input value={ctx.linkedinUrl} onChange={(e) => send({ type: "SET_LINKEDIN_URL", value: e.target.value })} placeholder="https://www.linkedin.com/in/votre-profil" className="brut-input" data-testid="linkedin-url-input" />
          <p className="text-xs text-zinc-500 mt-2">⚠️ LinkedIn bloque souvent l'extraction. Si ça échoue, utilise l'export PDF du profil ou la saisie manuelle.</p>
        </div>
      )}
      {ctx.profileMode === "manual" && (
        <textarea value={ctx.manualProfile} onChange={(e) => send({ type: "SET_MANUAL_PROFILE", value: e.target.value })} rows={10} placeholder="Nom, contact, expériences, formations, compétences…" className="brut-input" data-testid="manual-profile-input" />
      )}
      <PhotoPicker photo={ctx.photo} send={send} />
    </section>
  );
}

export function JobStep({ ctx, send }) {
  return (
    <section className="brut-card-flat p-6 sm:p-10" data-testid="step-2-content">
      <h2 className="font-display text-2xl sm:text-3xl mb-2">2. L'offre d'emploi</h2>
      <p className="text-sm text-zinc-600 mb-6">Donne-nous la cible.</p>
      <ModeGrid modes={JOB_MODES} current={ctx.jobMode} prefix="job-mode" onPick={(mode) => send({ type: "SET_JOB_MODE", mode })} />
      {ctx.jobMode === "url" && (
        <input value={ctx.jobUrl} onChange={(e) => send({ type: "SET_JOB_URL", value: e.target.value })} placeholder="https://… (Welcome to the Jungle, LinkedIn, Indeed…)" className="brut-input" data-testid="job-url-input" />
      )}
      {ctx.jobMode === "paste" && (
        <textarea value={ctx.jobText} onChange={(e) => send({ type: "SET_JOB_TEXT", value: e.target.value })} rows={12} placeholder="Collez le texte de l'annonce ici…" className="brut-input" data-testid="job-text-input" />
      )}
      {ctx.jobMode === "file" && (
        <FileDrop onFile={(file) => send({ type: "SET_JOB_FILE", file })} testId="job-file-drop" label="Glissez l'annonce (PDF / DOCX)" />
      )}
    </section>
  );
}

export function TemplateStep({ ctx, send }) {
  return (
    <section className="brut-card-flat p-6 sm:p-10" data-testid="step-3-content">
      <h2 className="font-display text-2xl sm:text-3xl mb-2">3. Choix du template</h2>
      <p className="text-sm text-zinc-600 mb-6">Sélectionne un style — modifiable plus tard.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => send({ type: "SET_TEMPLATE", template: t.key })}
            data-testid={`template-${t.key}`}
            className={`text-left rounded-lg border-2 border-black overflow-hidden transition-all ${ctx.template === t.key ? "shadow-[6px_6px_0_0_#0A0A0A] -translate-y-1" : "shadow-[2px_2px_0_0_#0A0A0A]"}`}
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
          <span className="font-bold">Récap :</span> {ctx.profileText.length} car. de profil, {ctx.jobText.length} car. d'annonce, template <span className="font-bold">{ctx.template}</span>.
        </p>
      </div>
    </section>
  );
}
