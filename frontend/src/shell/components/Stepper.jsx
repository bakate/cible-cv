import { Check } from "lucide-react";

const STEPS = [
  { n: 1, label: "Profil" },
  { n: 2, label: "Offre" },
  { n: 3, label: "Génération" },
  { n: 4, label: "Aperçu" },
];

export default function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" data-testid="wizard-stepper">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className="flex items-center gap-2 sm:gap-4">
            <div
              data-testid={`wizard-step-${s.n}`}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md border-2 border-black font-bold text-sm transition-all ${
                active ? "bg-[#FFEB3B] shadow-[3px_3px_0_0_#0A0A0A]" :
                done ? "bg-[#E8F5E9]" : "bg-white"
              }`}
            >
              <span className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs ${active ? "bg-black text-white" : done ? "bg-black text-white" : "bg-white"}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="hidden sm:block w-6 h-[2px] bg-black" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
