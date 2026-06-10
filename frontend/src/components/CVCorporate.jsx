const Section = ({ title, children }) => (
  <section className="mb-4">
    <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-1.5 border-b border-zinc-300 pb-1">
      {title}
    </h3>
    {children}
  </section>
);

const Bullet = ({ children }) => (
  <li className="flex gap-2 text-[11.5px] text-zinc-800 leading-snug mb-0.5">
    <span className="text-[#FF3E1A] font-bold leading-[1.1] mt-[1px]">›</span>
    <span className="flex-1">{children}</span>
  </li>
);

export default function CVCorporate({ cv, photo }) {
  if (!cv) return null;
  const c = cv.contact || {};
  const contactRows = [
    c.email && { label: "Email", value: c.email },
    c.phone && { label: "Tél", value: c.phone },
    c.location && { label: "Lieu", value: c.location },
    c.linkedin && { label: "LinkedIn", value: c.linkedin },
    c.github && { label: "GitHub", value: c.github },
    c.website && { label: "Web", value: c.website },
  ].filter(Boolean);

  return (
    <div className="cv-page padded font-sans" id="cv-render-area" data-testid="cv-template-corporate">
      <header className="mb-5 pb-3 border-b-2 border-black">
        <div className="flex items-start gap-5">
          {photo && (
            <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-black shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[28px] leading-[1.05] mb-1">{cv.full_name || ""}</h1>
            <p className="text-[13px] text-[#FF3E1A] font-semibold leading-snug">{cv.headline || ""}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-zinc-700">
          {contactRows.map((r, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5">
              <span className="font-bold text-zinc-500 uppercase tracking-wide text-[9px]">{r.label}</span>
              <span>{r.value}</span>
            </span>
          ))}
        </div>
      </header>

      {cv.summary && (
        <Section title="Profil">
          <p className="text-[11.5px] leading-snug text-zinc-800">{cv.summary}</p>
        </Section>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          {(cv.experiences || []).length > 0 && (
            <Section title="Expériences professionnelles">
              {cv.experiences.map((e, i) => (
                <div key={i} className="mb-2.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="font-bold text-[12px] leading-snug">{e.title}</h4>
                    <span className="text-[9.5px] font-mono text-zinc-500 whitespace-nowrap">
                      {e.start} – {e.end}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-700 leading-tight mb-1">
                    {e.company}{e.location ? ` — ${e.location}` : ""}
                  </p>
                  <ul className="space-y-0">
                    {(e.bullets || []).map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                  </ul>
                </div>
              ))}
            </Section>
          )}

          {(cv.education || []).length > 0 && (
            <Section title="Formation">
              {cv.education.map((e, i) => (
                <div key={i} className="mb-1.5 flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[11.5px] leading-tight">{e.degree}</h4>
                    <p className="text-[11px] text-zinc-700">{e.school}</p>
                    {e.details && <p className="text-[10.5px] text-zinc-600 italic">{e.details}</p>}
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-500 whitespace-nowrap">
                    {e.start} – {e.end}
                  </span>
                </div>
              ))}
            </Section>
          )}
        </div>

        <div className="col-span-1">
          {(cv.skills || []).length > 0 && (
            <Section title="Compétences">
              <div className="flex flex-wrap gap-1">
                {cv.skills.map((s, i) => (
                  <span key={i} className="text-[9.5px] bg-zinc-100 border border-zinc-300 px-1.5 py-[1px] rounded">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {(cv.tools || []).length > 0 && (
            <Section title="Outils">
              <p className="text-[10px] leading-snug text-zinc-700">{cv.tools.join(" · ")}</p>
            </Section>
          )}

          {(cv.languages || []).length > 0 && (
            <Section title="Langues">
              <ul className="space-y-0 text-[11px]">
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
              <ul className="space-y-1 text-[10.5px]">
                {cv.certifications.map((cer, i) => (
                  <li key={i}>
                    <p className="font-bold leading-tight">{cer.name}</p>
                    <p className="text-zinc-600 leading-tight">{cer.issuer}{cer.year ? ` · ${cer.year}` : ""}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(cv.interests || []).length > 0 && (
            <Section title="Centres d'intérêt">
              <p className="text-[10px] text-zinc-700">{cv.interests.join(" · ")}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
