import { Plus, Trash2 } from "lucide-react";

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
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Contact</summary>
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Email"><TxtInput value={c.email || ""} onChange={(e) => updContact({ email: e.target.value })} data-testid="edit-email" /></Field>
            <Field label="Téléphone"><TxtInput value={c.phone || ""} onChange={(e) => updContact({ phone: e.target.value })} data-testid="edit-phone" /></Field>
            <Field label="Lieu"><TxtInput value={c.location || ""} onChange={(e) => updContact({ location: e.target.value })} data-testid="edit-location" /></Field>
            <Field label="LinkedIn"><TxtInput value={c.linkedin || ""} onChange={(e) => updContact({ linkedin: e.target.value })} data-testid="edit-linkedin" /></Field>
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

      <details className="border-2 border-black rounded-md">
        <summary className="cursor-pointer p-3 font-bold bg-zinc-50">Compétences & outils</summary>
        <div className="p-3 space-y-4">
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
