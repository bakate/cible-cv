const Section = ({ title, children }) => (
  <section className="mb-5">
    <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2 border-b border-zinc-300 pb-1.5">
      {title}
    </h3>
    {children}
  </section>
);

const Bullet = ({ children }) => (
  <li className="flex gap-2 text-[12.5px] text-zinc-800 leading-snug mb-1">
    <span className="text-[color:var(--cv-accent)] font-bold leading-[1.1] mt-[1px]">›</span>
    <span className="flex-1">{children}</span>
  </li>
);

const linkify = (kind, value) => {
  if (!value) return null;
  if (kind === "email") return `mailto:${value}`;
  if (kind === "phone") return `tel:${value.replace(/[^0-9+]/g, "")}`;
  return value.startsWith("http") ? value : `https://${value}`;
};

export default function CVCorporate({ cv, photo, accent }) {
  if (!cv) return null;
  const c = cv.contact || {};
  const contactRows = [
    c.email && { label: "Email", value: c.email, href: linkify("email", c.email) },
    c.phone && { label: "Tél", value: c.phone, href: linkify("phone", c.phone) },
    c.location && { label: "Lieu", value: c.location, href: null },
    c.linkedin && { label: "LinkedIn", value: c.linkedin, href: linkify("url", c.linkedin) },
    c.github && { label: "GitHub", value: c.github, href: linkify("url", c.github) },
    c.website && { label: "Web", value: c.website, href: linkify("url", c.website) },
  ].filter(Boolean);

  return (
    <div
      className="cv-page padded font-sans"
      id="cv-render-area"
      data-testid="cv-template-corporate"
      style={{ "--cv-accent": accent || "#FF3E1A" }}
    >
      <header className="mb-6 pb-4 border-b-2 border-black">
        <div className="flex items-start gap-6">
          {photo && (
            <img src={photo} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-black shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[34px] leading-[1.05] mb-3">{cv.full_name || ""}</h1>
            <p className="text-[15px] text-[color:var(--cv-accent)] font-semibold leading-snug">{cv.headline || ""}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] text-zinc-700">
          {contactRows.map((r, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5">
              <span className="font-bold text-zinc-500 uppercase tracking-wide text-[9.5px]">{r.label}</span>
              {r.href ? (
                <a href={r.href} data-pdf-link={r.href} className="text-zinc-800">{r.value}</a>
              ) : (
                <span>{r.value}</span>
              )}
            </span>
          ))}
        </div>
      </header>

      {cv.summary && (
        <Section title="Profil">
          <p className="text-[12.5px] leading-relaxed text-zinc-800">{cv.summary}</p>
        </Section>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {(cv.experiences || []).length > 0 && (
            <Section title="Expériences professionnelles">
              {cv.experiences.map((e, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="font-bold text-[13.5px] leading-snug">{e.title}</h4>
                    <span className="text-[10.5px] font-mono text-zinc-500 whitespace-nowrap">
                      {e.start} – {e.end}
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-700 leading-tight mb-1.5">
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
                <div key={i} className="mb-2 flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[12.5px] leading-tight">{e.degree}</h4>
                    <p className="text-[12px] text-zinc-700">{e.school}</p>
                    {e.details && <p className="text-[11.5px] text-zinc-600 italic">{e.details}</p>}
                  </div>
                  <span className="text-[10.5px] font-mono text-zinc-500 whitespace-nowrap">
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
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[10.5px] leading-none bg-zinc-100 border border-zinc-300 px-2.5 py-[5px] rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {(cv.tools || []).length > 0 && (
            <Section title="Outils">
              <p className="text-[11px] leading-relaxed text-zinc-700">{cv.tools.join(" · ")}</p>
            </Section>
          )}

          {(cv.languages || []).length > 0 && (
            <Section title="Langues">
              <ul className="space-y-0.5 text-[12px]">
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
              <ul className="space-y-1.5 text-[11.5px]">
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
              <p className="text-[11px] text-zinc-700">{cv.interests.join(" · ")}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
