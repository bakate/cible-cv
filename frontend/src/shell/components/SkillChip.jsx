export default function SkillChip({ text, matched, theme = "light" }) {
  const matchedStyle = { background: "var(--cv-accent)", border: "1px solid var(--cv-accent)" };
  const baseClass = theme === "dark" ? "bg-white/10 border border-white/20" : "bg-zinc-100 border border-zinc-300";
  return (
    <span
      className={`inline-block text-[10px] leading-[18px] h-[18px] px-2 rounded align-middle ${matched ? "text-white font-bold" : baseClass}`}
      style={matched ? matchedStyle : undefined}
    >
      {text}
    </span>
  );
}
