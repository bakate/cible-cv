import { Mail, Phone, MapPin, Linkedin, Globe, Sparkles } from "lucide-react";

export default function CVStartup({ cv, photo }) {
  if (!cv) return null;
  const c = cv.contact || {};
  return (
    <div
      className="cv-page font-sans"
      id="cv-render-area"
      data-testid="cv-template-startup"
      style={{ paddingLeft: 0 }}
    >
      <div className="grid grid-cols-3 min-h-full -m-[18mm]">
        {/* Sidebar */}
        <aside className="col-span-1 bg-[#0A0A0A] text-white p-8">
          {photo && (
            <img src={photo} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-[#FF3E1A] mb-5" />
          )}
          <h1 className="font-display text-3xl leading-none mb-1">{cv.full_name || ""}</h1>
          <p className="text-[#FFEB3B] font-bold text-sm mb-5">{cv.headline || ""}</p>

          <div className="space-y-1.5 text-[12px] mb-6">
            {c.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</p>}
            {c.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</p>}
            {c.location && <p className="flex items-center gap-2"><MapPin className="w-3 h-3" />{c.location}</p>}
            {c.linkedin && <p className="flex items-center gap-2 break-all"><Linkedin className="w-3 h-3" />{c.linkedin}</p>}
            {c.website && <p className="flex items-center gap-2 break-all"><Globe className="w-3 h-3" />{c.website}</p>}
          </div>

          {(cv.skills || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF3E1A] mb-2">Stack</h3>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((s, i) => (
                  <span key={i} className="text-[10.5px] bg-white/10 border border-white/20 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {(cv.tools || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF3E1A] mb-2">Outils</h3>
              <p className="text-[11.5px] leading-relaxed text-zinc-300">{cv.tools.join(" · ")}</p>
            </div>
          )}

          {(cv.languages || []).length > 0 && (
            <div className="mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF3E1A] mb-2">Langues</h3>
              <ul className="text-[12px] space-y-0.5">
                {cv.languages.map((l, i) => (
                  <li key={i} className="flex justify-between"><span>{l.name}</span><span className="text-zinc-400">{l.level}</span></li>
                ))}
              </ul>
            </div>
          )}

          {(cv.interests || []).length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF3E1A] mb-2">Hobbies</h3>
              <p className="text-[11.5px] text-zinc-300">{cv.interests.join(" · ")}</p>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="col-span-2 p-8">
          {cv.summary && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#FF3E1A]" strokeWidth={2.5} />
                <h2 className="font-display text-xl">À propos</h2>
              </div>
              <p className="text-[13px] leading-relaxed text-zinc-800">{cv.summary}</p>
            </section>
          )}

          {(cv.experiences || []).length > 0 && (
            <section className="mb-6">
              <h2 className="font-display text-xl mb-3">Parcours</h2>
              <div className="space-y-4 border-l-2 border-[#FF3E1A] pl-5">
                {cv.experiences.map((e, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[27px] top-1.5 w-3 h-3 bg-[#FF3E1A] border-2 border-black rounded-full" />
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-[14px]">{e.title} <span className="text-zinc-500 font-normal">· {e.company}</span></h4>
                      <span className="text-[10.5px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                    </div>
                    {e.location && <p className="text-[12px] text-zinc-500 mb-1">{e.location}</p>}
                    <ul className="ml-4 list-disc space-y-0.5 text-[12.5px] text-zinc-800">
                      {(e.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(cv.education || []).length > 0 && (
            <section className="mb-4">
              <h2 className="font-display text-xl mb-3">Formation</h2>
              {cv.education.map((e, i) => (
                <div key={i} className="mb-2 flex justify-between items-baseline">
                  <div>
                    <h4 className="font-bold text-[13px]">{e.degree}</h4>
                    <p className="text-[12.5px] text-zinc-600">{e.school}{e.details ? ` — ${e.details}` : ""}</p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">{e.start} – {e.end}</span>
                </div>
              ))}
            </section>
          )}

          {(cv.certifications || []).length > 0 && (
            <section>
              <h2 className="font-display text-xl mb-3">Certifications</h2>
              <ul className="space-y-1 text-[12.5px]">
                {cv.certifications.map((cer, i) => (
                  <li key={i}><span className="font-bold">{cer.name}</span> — <span className="text-zinc-600">{cer.issuer}{cer.year ? `, ${cer.year}` : ""}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
