const Bullet = ({ children }) => (
  <li className="flex gap-2 text-[12px] leading-snug mb-1">
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

const LinkLine = ({ icon, href, text }) => (
  <p className="break-all">
    <span className="text-[color:var(--cv-accent)] font-bold mr-1.5">{icon}</span>
    {href ? <a href={href} data-pdf-link={href}>{text}</a> : text}
  </p>
);

export default function CVStartup({ cv, photo, accent }) {
  if (!cv) return null;
  const c = cv.contact || {};
  return (
    <div
      className="cv-page font-sans"
      id="cv-render-area"
      data-testid="cv-template-startup"
      style={{ "--cv-accent": accent || "#FF3E1A" }}
    >
      <div className="grid grid-cols-[34%_1fr] min-h-[297mm]">
        {/* Sidebar */}
        <aside className="bg-[#0A0A0A] text-white p-7">
          {photo && (
            <img src={photo} alt="" className="w-28 h-28 rounded-full object-cover border-[3px] border-[color:var(--cv-accent)] mb-5" />
          )}
          <h1 className="font-display text-[28px] leading-[1.05] mb-2">{cv.full_name || ""}</h1>
          <p className="text-[#FFEB3B] font-bold text-[13px] mb-5 leading-snug">{cv.headline || ""}</p>

          <div className="space-y-1.5 text-[11px] mb-6">
            {c.email && <LinkLine icon="✉" href={linkify("email", c.email)} text={c.email} />}
            {c.phone && <LinkLine icon="☎" href={linkify("phone", c.phone)} text={c.phone} />}
            {c.location && <LinkLine icon="◎" href={null} text={c.location} />}
            {c.linkedin && <LinkLine icon="in" href={linkify("url", c.linkedin)} text={c.linkedin} />}
            {c.github && <LinkLine icon={"</>"} href={linkify("url", c.github)} text={c.github} />}
            {c.website && <LinkLine icon="⌘" href={linkify("url", c.website)} text={c.website} />}
          </div>

          {(cv.skills || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--cv-accent)] mb-2">Stack</h3>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[10.5px] leading-none bg-white/10 border border-white/20 px-2.5 py-[5px] rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(cv.tools || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--cv-accent)] mb-2">Outils</h3>
              <p className="text-[11px] leading-snug text-zinc-300">{cv.tools.join(" · ")}</p>
            </div>
          )}

          {(cv.languages || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--cv-accent)] mb-2">Langues</h3>
              <ul className="text-[11.5px] space-y-0.5">
                {cv.languages.map((l, i) => (
                  <li key={i} className="flex justify-between gap-1">
                    <span>{l.name}</span><span className="text-zinc-400">{l.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(cv.certifications || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--cv-accent)] mb-2">Certifications</h3>
              <ul className="text-[11px] space-y-1.5">
                {cv.certifications.map((cer, i) => (
                  <li key={i}>
                    <p className="font-bold leading-tight">{cer.name}</p>
                    <p className="text-zinc-400 leading-tight">{cer.issuer}{cer.year ? ` · ${cer.year}` : ""}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(cv.interests || []).length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--cv-accent)] mb-2">Hobbies</h3>
              <p className="text-[11px] text-zinc-300">{cv.interests.join(" · ")}</p>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="p-7 bg-white">
          {cv.summary && (
            <section className="mb-5">
              <h2 className="font-display text-[19px] mb-2 border-b-2 border-[color:var(--cv-accent)] pb-1 inline-block pr-3">À propos</h2>
              <p className="text-[12.5px] leading-relaxed text-zinc-800">{cv.summary}</p>
            </section>
          )}

          {(cv.experiences || []).length > 0 && (
            <section className="mb-5">
              <h2 className="font-display text-[19px] mb-3 border-b-2 border-[color:var(--cv-accent)] pb-1 inline-block pr-3">Parcours</h2>
              <div className="space-y-3.5">
                {cv.experiences.map((e, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="font-bold text-[13px] leading-snug">
                        {e.title} <span className="text-zinc-500 font-normal">· {e.company}</span>
                      </h4>
                      <span className="text-[10.5px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                    </div>
                    {e.location && <p className="text-[11px] text-zinc-500 mb-1">{e.location}</p>}
                    <ul className="space-y-0 text-zinc-800">
                      {(e.bullets || []).map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(cv.education || []).length > 0 && (
            <section>
              <h2 className="font-display text-[19px] mb-3 border-b-2 border-[color:var(--cv-accent)] pb-1 inline-block pr-3">Formation</h2>
              {cv.education.map((e, i) => (
                <div key={i} className="mb-2 flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[12.5px] leading-tight">{e.degree}</h4>
                    <p className="text-[11.5px] text-zinc-600 leading-tight">{e.school}{e.details ? ` — ${e.details}` : ""}</p>
                  </div>
                  <span className="text-[10.5px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
