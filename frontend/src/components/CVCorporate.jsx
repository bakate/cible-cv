import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="mb-6">
    <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 border-b border-zinc-300 pb-1">
      {title}
    </h3>
    {children}
  </section>
);

export default function CVCorporate({ cv, photo }) {
  if (!cv) return null;
  const c = cv.contact || {};
  return (
    <div className="cv-page font-sans" id="cv-render-area" data-testid="cv-template-corporate">
      <header className="flex items-start gap-6 mb-8 pb-6 border-b-2 border-black">
        {photo && (
          <img src={photo} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-black" />
        )}
        <div className="flex-1">
          <h1 className="font-display text-4xl leading-none mb-2">{cv.full_name || ""}</h1>
          <p className="text-lg text-[#FF3E1A] font-semibold mb-3">{cv.headline || ""}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-700">
            {c.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</span>}
            {c.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{c.location}</span>}
            {c.linkedin && <span className="flex items-center gap-1.5"><Linkedin className="w-3 h-3" />{c.linkedin}</span>}
            {c.website && <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" />{c.website}</span>}
          </div>
        </div>
      </header>

      {cv.summary && (
        <Section title="Profil">
          <p className="text-[13px] leading-relaxed text-zinc-800">{cv.summary}</p>
        </Section>
      )}

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          {(cv.experiences || []).length > 0 && (
            <Section title="Expériences professionnelles">
              {cv.experiences.map((e, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <h4 className="font-bold text-[14px]">{e.title}</h4>
                      <p className="text-[13px] text-zinc-700">
                        {e.company}{e.location ? ` — ${e.location}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                      {e.start} – {e.end}
                    </span>
                  </div>
                  <ul className="mt-1.5 ml-4 list-disc space-y-0.5 text-[12.5px] text-zinc-800">
                    {(e.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </Section>
          )}

          {(cv.education || []).length > 0 && (
            <Section title="Formation">
              {cv.education.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <h4 className="font-bold text-[13px]">{e.degree}</h4>
                      <p className="text-[12.5px] text-zinc-700">{e.school}</p>
                      {e.details && <p className="text-[12px] text-zinc-600 italic">{e.details}</p>}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                      {e.start} – {e.end}
                    </span>
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>

        <div className="col-span-1">
          {(cv.skills || []).length > 0 && (
            <Section title="Compétences">
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((s, i) => (
                  <span key={i} className="text-[11px] bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {(cv.tools || []).length > 0 && (
            <Section title="Outils">
              <div className="flex flex-wrap gap-1.5">
                {cv.tools.map((s, i) => (
                  <span key={i} className="text-[11px] bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {(cv.languages || []).length > 0 && (
            <Section title="Langues">
              <ul className="space-y-0.5 text-[12.5px]">
                {cv.languages.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.name}</span><span className="text-zinc-500">{l.level}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(cv.certifications || []).length > 0 && (
            <Section title="Certifications">
              <ul className="space-y-1 text-[12px]">
                {cv.certifications.map((cer, i) => (
                  <li key={i}>
                    <p className="font-bold">{cer.name}</p>
                    <p className="text-zinc-600">{cer.issuer}{cer.year ? ` · ${cer.year}` : ""}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(cv.interests || []).length > 0 && (
            <Section title="Centres d'intérêt">
              <p className="text-[12px] text-zinc-700">{cv.interests.join(" · ")}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
