import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { ACCENT_PRESETS, DEFAULT_ACCENT, hasSkillsToRegroup } from "@/core/domain/cv";

const keyFor = (item, fallback) => item?._uid || `${fallback}`;

const Field = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">{label}</span>
    {children}
  </label>
);

const TxtInput = (props) => <input {...props} className={`brut-input !py-2 !text-sm ${props.className || ""}`} />;
const TxtArea = (props) => <textarea {...props} className={`brut-input !py-2 !text-sm ${props.className || ""}`} />;

const RemoveBtn = ({ onClick, testId, ghost }) => (
  <button type="button" onClick={onClick} aria-label="Supprimer" data-testid={testId} className={ghost ? "brut-btn brut-btn-ghost !px-2 !py-2" : "text-red-600 hover:bg-red-50 rounded p-1 shrink-0"}>
    <Trash2 className="w-4 h-4" />
  </button>
);

const AddBtn = ({ onClick, label, testId }) => (
  <button type="button" onClick={onClick} className="brut-btn brut-btn-ghost !py-1.5 !px-3 text-sm" data-testid={testId}>
    <Plus className="w-3 h-3" /> {label}
  </button>
);

const Section = ({ title, open, children }) => (
  <details className="border-2 border-black rounded-md" open={open}>
    <summary className="cursor-pointer p-3 font-bold bg-zinc-50">{title}</summary>
    <div className="p-3 space-y-3">{children}</div>
  </details>
);

/** Every edit is an event with a path; the machine applies it immutably. */
const useEdit = (send) => ({
  set: (path, value) => send({ type: "EDIT_SET", path: ["cv", ...path], value }),
  add: (path, kind) => send({ type: "EDIT_APPEND", path: ["cv", ...path], kind }),
  remove: (path, index) => send({ type: "EDIT_REMOVE", path: ["cv", ...path], index }),
});

const ListEditor = ({ items = [], path, edit, placeholder, testId }) => (
  <div className="space-y-2" data-testid={testId}>
    {items.map((v, i) => (
      <div key={i} className="flex gap-2">
        <TxtInput value={v} onChange={(e) => edit.set([...path, i], e.target.value)} placeholder={placeholder} />
        <RemoveBtn ghost onClick={() => edit.remove(path, i)} />
      </div>
    ))}
    <AddBtn onClick={() => edit.add(path, "text")} label="Ajouter" />
  </div>
);

const Bound = ({ path, edit, value, ...rest }) => <TxtInput value={value || ""} onChange={(e) => edit.set(path, e.target.value)} {...rest} />;

function LetterEditor({ letter, send }) {
  const set = (field, value) => send({ type: "EDIT_SET", path: ["letter", field], value });
  return (
    <div className="brut-card-flat p-5 mb-4 space-y-3" data-testid="edit-panel-letter">
      <Field label="Destinataire"><TxtInput value={letter.recipient || ""} onChange={(e) => set("recipient", e.target.value)} data-testid="edit-letter-recipient" /></Field>
      <Field label="Objet"><TxtInput value={letter.subject || ""} onChange={(e) => set("subject", e.target.value)} data-testid="edit-letter-subject" /></Field>
      <Field label="Corps de la lettre"><TxtArea rows={12} value={letter.body || ""} onChange={(e) => set("body", e.target.value)} data-testid="edit-letter-body" /></Field>
    </div>
  );
}

function AppearanceSection({ cv, edit }) {
  const accent = cv.theme?.accent || DEFAULT_ACCENT;
  return (
    <Section title="Apparence">
      <Field label="Couleur d'accent (titre, puces, séparateurs)">
        <div className="flex items-center gap-3">
          <input type="color" value={accent} onChange={(e) => edit.set(["theme", "accent"], e.target.value)} className="w-12 h-10 rounded-md border-2 border-black cursor-pointer" data-testid="edit-accent-color" />
          <Bound path={["theme", "accent"]} edit={edit} value={accent} className="font-mono" />
          <div className="flex gap-1">
            {ACCENT_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => edit.set(["theme", "accent"], c)} style={{ background: c }} className="w-6 h-6 rounded-full border-2 border-black" aria-label={`Choisir ${c}`} data-testid={`preset-color-${c.replace("#", "")}`} />
            ))}
          </div>
        </div>
      </Field>
    </Section>
  );
}

function ContactSection({ cv, edit }) {
  const c = cv.contact || {};
  const f = (key, label, testId, className) => (
    <Field label={label} className={className}><Bound path={["contact", key]} edit={edit} value={c[key]} data-testid={testId} /></Field>
  );
  return (
    <Section title="Contact">
      <div className="grid grid-cols-2 gap-2">
        {f("email", "Email", "edit-email")}
        {f("phone", "Téléphone", "edit-phone")}
        {f("location", "Lieu", "edit-location")}
        {f("linkedin", "LinkedIn", "edit-linkedin")}
        {f("github", "GitHub", "edit-github")}
        {f("website", "Site web", "edit-website", "col-span-2")}
      </div>
    </Section>
  );
}

function ExperiencesSection({ cv, edit }) {
  const list = cv.experiences || [];
  return (
    <Section title={`Expériences (${list.length})`} open>
      {list.map((e, i) => {
        const p = ["experiences", i];
        return (
          <div key={keyFor(e, `exp-${i}`)} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-exp-${i}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500">Expérience #{i + 1}</span>
              <RemoveBtn onClick={() => edit.remove(["experiences"], i)} testId={`remove-exp-${i}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Poste"><Bound path={[...p, "title"]} edit={edit} value={e.title} /></Field>
              <Field label="Entreprise"><Bound path={[...p, "company"]} edit={edit} value={e.company} /></Field>
              <Field label="Lieu"><Bound path={[...p, "location"]} edit={edit} value={e.location} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Début"><Bound path={[...p, "start"]} edit={edit} value={e.start} /></Field>
                <Field label="Fin"><Bound path={[...p, "end"]} edit={edit} value={e.end} /></Field>
              </div>
            </div>
            <Field label="Réalisations">
              <ListEditor items={e.bullets || []} path={[...p, "bullets"]} edit={edit} placeholder="Une réalisation ou responsabilité" testId={`exp-${i}-bullets`} />
            </Field>
          </div>
        );
      })}
      <AddBtn onClick={() => edit.add(["experiences"], "experience")} label="Ajouter une expérience" testId="add-experience" />
    </Section>
  );
}

function EducationSection({ cv, edit }) {
  const list = cv.education || [];
  return (
    <Section title={`Formation (${list.length})`}>
      {list.map((e, i) => {
        const p = ["education", i];
        return (
          <div key={keyFor(e, `edu-${i}`)} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-edu-${i}`}>
            <div className="flex justify-end"><RemoveBtn onClick={() => edit.remove(["education"], i)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Diplôme"><Bound path={[...p, "degree"]} edit={edit} value={e.degree} /></Field>
              <Field label="École"><Bound path={[...p, "school"]} edit={edit} value={e.school} /></Field>
              <Field label="Début"><Bound path={[...p, "start"]} edit={edit} value={e.start} /></Field>
              <Field label="Fin"><Bound path={[...p, "end"]} edit={edit} value={e.end} /></Field>
            </div>
            <Field label="Détails"><Bound path={[...p, "details"]} edit={edit} value={e.details} /></Field>
          </div>
        );
      })}
      <AddBtn onClick={() => edit.add(["education"], "education")} label="Ajouter une formation" testId="add-education" />
    </Section>
  );
}

function SkillGroupsSection({ cv, edit, send, regrouping }) {
  const list = cv.skill_groups || [];
  return (
    <Section title={`Compétences par famille (${list.length})`} open>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => send({ type: "REGROUP_SKILLS" })} disabled={regrouping || !hasSkillsToRegroup(cv)} className="brut-btn brut-btn-yellow !py-1.5 !px-3 text-sm" data-testid="auto-regroup-button">
          {regrouping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Regrouper auto (IA)
        </button>
        <span className="text-xs text-zinc-500">Classe automatiquement tes compétences + outils par famille via Claude.</span>
      </div>
      {list.map((g, i) => (
        <div key={keyFor(g, `grp-${i}`)} className="border border-zinc-300 rounded-md p-3 space-y-2 bg-white" data-testid={`edit-group-${i}`}>
          <div className="flex items-center justify-between gap-2">
            <Bound path={["skill_groups", i, "category"]} edit={edit} value={g.category} placeholder="Nom de la famille (ex: Frontend)" className="!text-sm font-bold" />
            <RemoveBtn onClick={() => edit.remove(["skill_groups"], i)} testId={`remove-group-${i}`} />
          </div>
          <ListEditor items={g.items || []} path={["skill_groups", i, "items"]} edit={edit} placeholder="Une compétence ou un outil" testId={`group-${i}-items`} />
        </div>
      ))}
      <AddBtn onClick={() => edit.add(["skill_groups"], "skillGroup")} label="Ajouter une famille" testId="add-group" />
    </Section>
  );
}

function FlatListsSection({ cv, edit }) {
  return (
    <Section title="Liste à plat (skills / outils / intérêts)">
      <p className="text-xs text-zinc-500">Liste plate utilisée pour les ATS ou comme fallback si les familles sont vides.</p>
      <Field label="Compétences"><ListEditor items={cv.skills || []} path={["skills"]} edit={edit} placeholder="ex: TypeScript" testId="edit-skills" /></Field>
      <Field label="Outils"><ListEditor items={cv.tools || []} path={["tools"]} edit={edit} placeholder="ex: Figma" testId="edit-tools" /></Field>
      <Field label="Centres d'intérêt"><ListEditor items={cv.interests || []} path={["interests"]} edit={edit} placeholder="ex: Photographie" testId="edit-interests" /></Field>
    </Section>
  );
}

function LanguagesSection({ cv, edit }) {
  const list = cv.languages || [];
  return (
    <Section title={`Langues (${list.length})`}>
      {list.map((l, i) => (
        <div key={keyFor(l, `lang-${i}`)} className="flex gap-2 items-end" data-testid={`edit-lang-${i}`}>
          <Field label="Langue" className="flex-1"><Bound path={["languages", i, "name"]} edit={edit} value={l.name} /></Field>
          <Field label="Niveau" className="flex-1"><Bound path={["languages", i, "level"]} edit={edit} value={l.level} /></Field>
          <RemoveBtn ghost onClick={() => edit.remove(["languages"], i)} />
        </div>
      ))}
      <AddBtn onClick={() => edit.add(["languages"], "language")} label="Ajouter une langue" testId="add-language" />
    </Section>
  );
}

function CertificationsSection({ cv, edit }) {
  const list = cv.certifications || [];
  return (
    <Section title={`Certifications (${list.length})`}>
      {list.map((cer, i) => (
        <div key={keyFor(cer, `cert-${i}`)} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-end" data-testid={`edit-cert-${i}`}>
          <Field label="Intitulé"><Bound path={["certifications", i, "name"]} edit={edit} value={cer.name} /></Field>
          <Field label="Organisme"><Bound path={["certifications", i, "issuer"]} edit={edit} value={cer.issuer} /></Field>
          <Field label="Année"><Bound path={["certifications", i, "year"]} edit={edit} value={cer.year} /></Field>
          <RemoveBtn ghost onClick={() => edit.remove(["certifications"], i)} />
        </div>
      ))}
      <AddBtn onClick={() => edit.add(["certifications"], "certification")} label="Ajouter une certification" testId="add-certification" />
    </Section>
  );
}

export default function FullEditor({ cv = {}, letter = {}, tab, send, regrouping }) {
  const edit = useEdit(send);
  if (tab === "letter") return <LetterEditor letter={letter} send={send} />;
  return (
    <div className="brut-card-flat p-5 mb-4 space-y-5" data-testid="edit-panel-cv">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom complet"><Bound path={["full_name"]} edit={edit} value={cv.full_name} data-testid="edit-name" /></Field>
        <Field label="Titre / Headline"><Bound path={["headline"]} edit={edit} value={cv.headline} data-testid="edit-headline" /></Field>
      </div>
      <Field label="Résumé"><TxtArea rows={4} value={cv.summary || ""} onChange={(e) => edit.set(["summary"], e.target.value)} data-testid="edit-summary" /></Field>
      <AppearanceSection cv={cv} edit={edit} />
      <ContactSection cv={cv} edit={edit} />
      <ExperiencesSection cv={cv} edit={edit} />
      <EducationSection cv={cv} edit={edit} />
      <SkillGroupsSection cv={cv} edit={edit} send={send} regrouping={regrouping} />
      <FlatListsSection cv={cv} edit={edit} />
      <LanguagesSection cv={cv} edit={edit} />
      <CertificationsSection cv={cv} edit={edit} />
    </div>
  );
}
