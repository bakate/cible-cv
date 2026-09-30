/* eslint-disable react/no-unescaped-entities */
import { useMachine } from "@xstate/react";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { wizardMachine, selectWizardStep, selectWizardBusy } from "@/core/machines/wizardMachine";
import { stepNumber } from "@/core/domain/wizard";
import { useServices, useShellEffects } from "@/shell/providers";
import Stepper from "@/shell/components/Stepper";
import { ProfileStep, JobStep, TemplateStep } from "@/shell/components/WizardSteps";

const STEP_VIEWS = { profile: ProfileStep, job: JobStep, template: TemplateStep };

export default function Wizard() {
  const services = useServices();
  const [snap, send, actor] = useMachine(wizardMachine, { input: { services } });
  useShellEffects(actor);

  const step = selectWizardStep(snap);
  const busy = selectWizardBusy(snap);
  const StepView = STEP_VIEWS[step];

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">
            Génère ton CV.<br />
            <span className="text-[#FF3E1A]">En 4 étapes.</span>
          </h1>
          <p className="mt-3 text-zinc-600 max-w-xl">
            Importe ton profil, colle une offre, choisis ton style. On adapte tout — sans rien inventer.
          </p>
        </div>
        <Stepper current={stepNumber(step)} />
      </div>

      <StepView ctx={snap.context} send={send} />

      <div className="flex items-center justify-between mt-8">
        <button onClick={() => send({ type: "BACK" })} disabled={step === "profile" || busy} className="brut-btn brut-btn-ghost" data-testid="wizard-back-button">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button onClick={() => send({ type: "NEXT" })} disabled={busy} className="brut-btn" data-testid="wizard-next-button">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {step === "template" ? "Générer mon CV" : "Suivant"}
        </button>
      </div>
    </div>
  );
}
