const Bullet = ({ children, color = "#FF3E1A" }) => (
  <li className="flex gap-2 text-[11px] leading-snug mb-0.5">
    <span style={{ color }} className="font-bold leading-[1.1] mt-[1px]">›</span>
    <span className="flex-1">{children}</span>
  </li>
);

export default function CVStartup({ cv, photo }) {
  if (!cv) return null;
  const c = cv.contact || {};
  return (
    <div className="cv-page font-sans" id="cv-render-area" data-testid="cv-template-startup">
      <div className="grid grid-cols-[34%_1fr] min-h-[297mm]">
        {/* Sidebar */}
        <aside className="bg-[#0A0A0A] text-white p-6">
          {photo && (
            <img src={photo} alt="" className="w-24 h-24 rounded-full object-cover border-[3px] border-[#FF3E1A] mb-4" />
          )}
          <h1 className="font-display text-[26px] leading-[1.05] mb-1">{cv.full_name || ""}</h1>
          <p className="text-[#FFEB3B] font-bold text-[11.5px] mb-4 leading-snug">{cv.headline || ""}</p>

          <div className="space-y-1 text-[10px] mb-5">
            {c.email && <p className="break-all"><span className="text-[#FF3E1A] font-bold mr-1">✉</span>{c.email}</p>}
            {c.phone && <p><span className="text-[#FF3E1A] font-bold mr-1">☎</span>{c.phone}</p>}
            {c.location && <p><span className="text-[#FF3E1A] font-bold mr-1">◎</span>{c.location}</p>}
            {c.linkedin && <p className="break-all"><span className="text-[#FF3E1A] font-bold mr-1">in</span>{c.linkedin}</p>}
            {c.website && <p className="break-all"><span className="text-[#FF3E1A] font-bold mr-1">⌘</span>{c.website}</p>}
          </div>

          {(cv.skills || []).length > 0 && (
            <div className="mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-[#FF3E1A] mb-1.5">Stack</h3>
              <div className="flex flex-wrap gap-1">
                {cv.skills.map((s, i) => (
                  <span key={i} className="text-[9.5px] bg-white/10 border border-white/20 px-1.5 py-[1px] rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {(cv.tools || []).length > 0 && (
            <div className="mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-[#FF3E1A] mb-1.5">Outils</h3>
              <p className="text-[10px] leading-snug text-zinc-300">{cv.tools.join(" · ")}</p>
            </div>
          )}

          {(cv.languages || []).length > 0 && (
            <div className="mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-[#FF3E1A] mb-1.5">Langues</h3>
              <ul className="text-[10.5px] space-y-0">
                {cv.languages.map((l, i) => (
                  <li key={i} className="flex justify-between gap-1">
                    <span>{l.name}</span><span className="text-zinc-400">{l.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(cv.certifications || []).length > 0 && (
            <div className="mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-[#FF3E1A] mb-1.5">Certifications</h3>
              <ul className="text-[10px] space-y-1">
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
              <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-[#FF3E1A] mb-1.5">Hobbies</h3>
              <p className="text-[10px] text-zinc-300">{cv.interests.join(" · ")}</p>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="p-6 bg-white">
          {cv.summary && (
            <section className="mb-4">
              <h2 className="font-display text-[17px] mb-1.5 border-b-2 border-[#FF3E1A] pb-1 inline-block pr-3">À propos</h2>
              <p className="text-[11.5px] leading-snug text-zinc-800">{cv.summary}</p>
            </section>
          )}

          {(cv.experiences || []).length > 0 && (
            <section className="mb-4">
              <h2 className="font-display text-[17px] mb-2 border-b-2 border-[#FF3E1A] pb-1 inline-block pr-3">Parcours</h2>
              <div className="space-y-2.5">
                {cv.experiences.map((e, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="font-bold text-[12px] leading-snug">
                        {e.title} <span className="text-zinc-500 font-normal">· {e.company}</span>
                      </h4>
                      <span className="text-[9.5px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                    </div>
                    {e.location && <p className="text-[10px] text-zinc-500 mb-1">{e.location}</p>}
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
              <h2 className="font-display text-[17px] mb-2 border-b-2 border-[#FF3E1A] pb-1 inline-block pr-3">Formation</h2>
              {cv.education.map((e, i) => (
                <div key={i} className="mb-1.5 flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[11.5px] leading-tight">{e.degree}</h4>
                    <p className="text-[10.5px] text-zinc-600 leading-tight">{e.school}{e.details ? ` — ${e.details}` : ""}</p>
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
