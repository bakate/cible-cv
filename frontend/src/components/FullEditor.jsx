import { useState } from "react";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { regroupSkills } from "../lib/api";

const Field = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">{label}</span>
    {children}
  </label>
);

const TxtInput = (props) => (
  <input
    {...props}
    className={`brut-input !py-2 !text-sm ${props.className || ""}`}
  />
);

const TxtArea = (props) => (
  <textarea
    {...props}
    className={`brut-input !py-2 !text-sm ${props.className || ""}`}
  />
);

const ListEditor = ({ items = [], onChange, placeholder, testId }) => (
  <div className="space-y-2" data-testid={testId}>
    {items.map((v, i) => (
      <div key={i} className="flex gap-2">
        <TxtInput
          value={v}
          onChange={(e) => {
            const next = [...items];
            next[i] = e.target.value;
            onChange(next);
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onChange(items.filter((_, j) => j !== i))}
          className="brut-btn brut-btn-ghost !px-2 !py-2"
          aria-label="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...items, ""])}
      className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
    >
      <Plus className="w-3 h-3" /> Ajouter
    </button>
  </div>
);

export default function FullEditor({ data, setData, tab }) {
  const cv = data.cv || {};
  const letter = data.letter || {};
  const c = cv.contact || {};

  const updCv = (patch) => setData({ ...data, cv: { ...cv, ...patch } });
  const updContact = (patch) => updCv({ contact: { ...c, ...patch } });
  const updLetter = (patch) => setData({ ...data, letter: { ...letter, ...patch } });
  const [regrouping, setRegrouping] = useState(false);

  const autoRegroup = async () => {
    setRegrouping(true);
    try {
      const res = await regroupSkills({ skills: cv.skills || [], tools: cv.tools || [] });
      if (res.skill_groups) {
        updCv({ skill_groups: res.skill_groups });
        toast.success("Compétences regroupées par famille");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Échec du regroupement");
    } finally {
      setRegrouping(false);
    }
  };

  if (tab === "letter") {
    return (
      <div className="brut-card-flat p-5 mb-4 space-y-3" data-testid="edit-panel-letter">
        <Field label="Destinataire">
          <TxtInput value={letter.recipient || ""} onChange={(e) => updLetter({ recipient: e.target.value })} data-testid="edit-letter-recipient" />
        </Field>
        <Field label="Objet">
          <TxtInput value={letter.subject || ""} onChange={(e) => updLetter({ subject: e.target.value })} data-testid="edit-letter-subject" />
        </Field>
        <Field label="Corps de la lettre">
          <TxtArea rows={12} value={letter.body || ""} onChange={(e) => updLetter({ body: e.target.value })} data-testid="edit-letter-body" />
        </Field>
      </div>
    );
  }

  return (
    <div className="brut-card-flat p-5 mb-4 space-y-5" data-testid="edit-panel-cv">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom complet">
          <TxtInput value={cv.full_name || ""} onChange={(e) => updCv({ full_name: e.target.value })} data-testid="edit-name" />
        </Field>
        <Field label="Titre / Headline">
          <TxtInput value={cv.headline || ""} onChange={(e) => updCv({ headline: e.target.value })} data-testid="edit-headline" />
        </Field>
      </div>

      <Field label="Résumé">
        <TxtArea rows={4} value={cv.summary || ""} onChange={(e) => updCv({ summary: e.target.value })} data-testid="edit-summary" />
      </Field>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Apparence</summary>
        <div className="p-3 space-y-3">
          <Field label="Couleur d'accent (titre, puces, séparateurs)">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cv.theme?.accent || "#FF3E1A"}
                onChange={(e) => updCv({ theme: { ...(cv.theme || {}), accent: e.target.value } })}
                className="w-12 h-10 rounded-md border-2 border-black cursor-pointer"
                data-testid="edit-accent-color"
              />
              <TxtInput
                value={cv.theme?.accent || "#FF3E1A"}
                onChange={(e) => updCv({ theme: { ...(cv.theme || {}), accent: e.target.value } })}
                className="font-mono"
              />
              <div className="flex gap-1">
                {["#FF3E1A", "#0EA5E9", "#10B981", "#8B5CF6", "#0A0A0A", "#D97706"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updCv({ theme: { ...(cv.theme || {}), accent: c } })}
                    style={{ background: c }}
                    className="w-6 h-6 rounded-full border-2 border-black"
                    aria-label={`Choisir ${c}`}
                    data-testid={`preset-color-${c.replace("#", "")}`}
                  />
                ))}
              </div>
            </div>
          </Field>
        </div>
      </details>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Contact</summary>
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Email"><TxtInput value={c.email || ""} onChange={(e) => updContact({ email: e.target.value })} data-testid="edit-email" /></Field>
            <Field label="Téléphone"><TxtInput value={c.phone || ""} onChange={(e) => updContact({ phone: e.target.value })} data-testid="edit-phone" /></Field>
            <Field label="Lieu"><TxtInput value={c.location || ""} onChange={(e) => updContact({ location: e.target.value })} data-testid="edit-location" /></Field>
            <Field label="LinkedIn"><TxtInput value={c.linkedin || ""} onChange={(e) => updContact({ linkedin: e.target.value })} data-testid="edit-linkedin" /></Field>
            <Field label="GitHub"><TxtInput value={c.github || ""} onChange={(e) => updContact({ github: e.target.value })} data-testid="edit-github" /></Field>
            <Field label="Site web" className="col-span-2"><TxtInput value={c.website || ""} onChange={(e) => updContact({ website: e.target.value })} data-testid="edit-website" /></Field>
          </div>
        </div>
      </details>

      <details className="border-2 border-black rounded-md" open>
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Expériences ({(cv.experiences || []).length})</summary>
        <div className="p-3 space-y-4">
          {(cv.experiences || []).map((e, i) => (
            <div key={i} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-exp-${i}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500">Expérience #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => updCv({ experiences: cv.experiences.filter((_, j) => j !== i) })}
                  className="text-red-600 hover:bg-red-50 rounded p-1"
                  data-testid={`remove-exp-${i}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Poste"><TxtInput value={e.title || ""} onChange={(ev) => {
                  const next = [...cv.experiences]; next[i] = { ...e, title: ev.target.value }; updCv({ experiences: next });
                }} /></Field>
                <Field label="Entreprise"><TxtInput value={e.company || ""} onChange={(ev) => {
                  const next = [...cv.experiences]; next[i] = { ...e, company: ev.target.value }; updCv({ experiences: next });
                }} /></Field>
                <Field label="Lieu"><TxtInput value={e.location || ""} onChange={(ev) => {
                  const next = [...cv.experiences]; next[i] = { ...e, location: ev.target.value }; updCv({ experiences: next });
                }} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Début"><TxtInput value={e.start || ""} onChange={(ev) => {
                    const next = [...cv.experiences]; next[i] = { ...e, start: ev.target.value }; updCv({ experiences: next });
                  }} /></Field>
                  <Field label="Fin"><TxtInput value={e.end || ""} onChange={(ev) => {
                    const next = [...cv.experiences]; next[i] = { ...e, end: ev.target.value }; updCv({ experiences: next });
                  }} /></Field>
                </div>
              </div>
              <Field label="Réalisations">
                <ListEditor
                  items={e.bullets || []}
                  onChange={(bullets) => {
                    const next = [...cv.experiences]; next[i] = { ...e, bullets }; updCv({ experiences: next });
                  }}
                  placeholder="Une réalisation ou responsabilité"
                  testId={`exp-${i}-bullets`}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updCv({ experiences: [...(cv.experiences || []), { title: "", company: "", location: "", start: "", end: "", bullets: [] }] })}
            className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
            data-testid="add-experience"
          >
            <Plus className="w-3 h-3" /> Ajouter une expérience
          </button>
        </div>
      </details>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Formation ({(cv.education || []).length})</summary>
        <div className="p-3 space-y-3">
          {(cv.education || []).map((e, i) => (
            <div key={i} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-edu-${i}`}>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updCv({ education: cv.education.filter((_, j) => j !== i) })}
                  className="text-red-600 hover:bg-red-50 rounded p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Diplôme"><TxtInput value={e.degree || ""} onChange={(ev) => {
                  const next = [...cv.education]; next[i] = { ...e, degree: ev.target.value }; updCv({ education: next });
                }} /></Field>
                <Field label="École"><TxtInput value={e.school || ""} onChange={(ev) => {
                  const next = [...cv.education]; next[i] = { ...e, school: ev.target.value }; updCv({ education: next });
                }} /></Field>
                <Field label="Début"><TxtInput value={e.start || ""} onChange={(ev) => {
                  const next = [...cv.education]; next[i] = { ...e, start: ev.target.value }; updCv({ education: next });
                }} /></Field>
                <Field label="Fin"><TxtInput value={e.end || ""} onChange={(ev) => {
                  const next = [...cv.education]; next[i] = { ...e, end: ev.target.value }; updCv({ education: next });
                }} /></Field>
              </div>
              <Field label="Détails"><TxtInput value={e.details || ""} onChange={(ev) => {
                const next = [...cv.education]; next[i] = { ...e, details: ev.target.value }; updCv({ education: next });
              }} /></Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updCv({ education: [...(cv.education || []), { degree: "", school: "", start: "", end: "", details: "" }] })}
            className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
            data-testid="add-education"
          >
            <Plus className="w-3 h-3" /> Ajouter une formation
          </button>
        </div>
      </details>

      <details className="border-2 border-black rounded-md" open>
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Compétences par famille ({(cv.skill_groups || []).length})</summary>
        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={autoRegroup}
              disabled={regrouping || ((cv.skills || []).length === 0 && (cv.tools || []).length === 0)}
              className="brut-btn brut-btn-yellow !py-1.5 !px-3 text-sm"
              data-testid="auto-regroup-button"
            >
              {regrouping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Regrouper auto (IA)
            </button>
            <span className="text-xs text-zinc-500">Classe automatiquement tes compétences + outils par famille via Claude.</span>
          </div>

          {(cv.skill_groups || []).map((g, i) => (
            <div key={i} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-group-${i}`}>
              <div className="flex items-center justify-between gap-2">
                <TxtInput
                  value={g.category || ""}
                  onChange={(ev) => {
                    const next = [...cv.skill_groups]; next[i] = { ...g, category: ev.target.value }; updCv({ skill_groups: next });
                  }}
                  placeholder="Nom de la famille (ex: Frontend)"
                  className="!text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => updCv({ skill_groups: cv.skill_groups.filter((_, j) => j !== i) })}
                  className="text-red-600 hover:bg-red-50 rounded p-1 shrink-0"
                  data-testid={`remove-group-${i}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <ListEditor
                items={g.items || []}
                onChange={(items) => {
                  const next = [...cv.skill_groups]; next[i] = { ...g, items }; updCv({ skill_groups: next });
                }}
                placeholder="Une compétence ou un outil"
                testId={`group-${i}-items`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updCv({ skill_groups: [...(cv.skill_groups || []), { category: "", items: [] }] })}
            className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
            data-testid="add-group"
          >
            <Plus className="w-3 h-3" /> Ajouter une famille
          </button>
        </div>
      </details>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Liste à plat (skills / outils / intérêts)</summary>
        <div className="p-3 space-y-4">
          <p className="text-xs text-zinc-500">Liste plate utilisée pour les ATS ou comme fallback si les familles sont vides.</p>
          <Field label="Compétences">
            <ListEditor
              items={cv.skills || []}
              onChange={(skills) => updCv({ skills })}
              placeholder="ex: TypeScript"
              testId="edit-skills"
            />
          </Field>
          <Field label="Outils">
            <ListEditor
              items={cv.tools || []}
              onChange={(tools) => updCv({ tools })}
              placeholder="ex: Figma"
              testId="edit-tools"
            />
          </Field>
          <Field label="Centres d'intérêt">
            <ListEditor
              items={cv.interests || []}
              onChange={(interests) => updCv({ interests })}
              placeholder="ex: Photographie"
              testId="edit-interests"
            />
          </Field>
        </div>
      </details>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Langues ({(cv.languages || []).length})</summary>
        <div className="p-3 space-y-2">
          {(cv.languages || []).map((l, i) => (
            <div key={i} className="flex gap-2 items-end" data-testid={`edit-lang-${i}`}>
              <Field label="Langue" className="flex-1">
                <TxtInput value={l.name || ""} onChange={(ev) => {
                  const next = [...cv.languages]; next[i] = { ...l, name: ev.target.value }; updCv({ languages: next });
                }} />
              </Field>
              <Field label="Niveau" className="flex-1">
                <TxtInput value={l.level || ""} onChange={(ev) => {
                  const next = [...cv.languages]; next[i] = { ...l, level: ev.target.value }; updCv({ languages: next });
                }} />
              </Field>
              <button
                type="button"
                onClick={() => updCv({ languages: cv.languages.filter((_, j) => j !== i) })}
                className="brut-btn brut-btn-ghost !px-2 !py-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updCv({ languages: [...(cv.languages || []), { name: "", level: "" }] })}
            className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
            data-testid="add-language"
          >
            <Plus className="w-3 h-3" /> Ajouter une langue
          </button>
        </div>
      </details>

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Certifications ({(cv.certifications || []).length})</summary>
        <div className="p-3 space-y-2">
          {(cv.certifications || []).map((cer, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-end" data-testid={`edit-cert-${i}`}>
              <Field label="Intitulé"><TxtInput value={cer.name || ""} onChange={(ev) => {
                const next = [...cv.certifications]; next[i] = { ...cer, name: ev.target.value }; updCv({ certifications: next });
              }} /></Field>
              <Field label="Organisme"><TxtInput value={cer.issuer || ""} onChange={(ev) => {
                const next = [...cv.certifications]; next[i] = { ...cer, issuer: ev.target.value }; updCv({ certifications: next });
              }} /></Field>
              <Field label="Année"><TxtInput value={cer.year || ""} onChange={(ev) => {
                const next = [...cv.certifications]; next[i] = { ...cer, year: ev.target.value }; updCv({ certifications: next });
              }} /></Field>
              <button
                type="button"
                onClick={() => updCv({ certifications: cv.certifications.filter((_, j) => j !== i) })}
                className="brut-btn brut-btn-ghost !px-2 !py-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updCv({ certifications: [...(cv.certifications || []), { name: "", issuer: "", year: "" }] })}
            className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm"
            data-testid="add-certification"
          >
            <Plus className="w-3 h-3" /> Ajouter une certification
          </button>
        </div>
      </details>
    </div>
  );
}
