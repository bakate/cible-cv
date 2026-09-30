/** Wizard business rules: modes, input validation, step numbering. */
import type { JobMode, ProfileMode } from "./types";

export const PROFILE_MODES: ProfileMode[] = ["pdf", "linkedin", "manual"];
export const JOB_MODES: JobMode[] = ["url", "paste", "file"];
export const WIZARD_STEPS = ["profile", "job", "template"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
export const stepNumber = (step: WizardStep): number => WIZARD_STEPS.indexOf(step) + 1;

export interface ProfileInputs {
  profileMode: ProfileMode;
  profileFile: File | null;
  linkedinUrl: string;
  manualProfile: string;
}

export interface JobInputs {
  jobMode: JobMode;
  jobUrl: string;
  jobText: string;
  jobFile: File | null;
}

/** Returns a French error message, or null when the inputs are usable. */
export const validateProfileInputs = (p: ProfileInputs): string | null => {
  if (p.profileMode === "pdf" && !p.profileFile) return "Importez un fichier de profil";
  if (p.profileMode === "linkedin" && !p.linkedinUrl.trim()) return "Saisissez une URL LinkedIn";
  if (p.profileMode === "manual" && !p.manualProfile.trim()) return "Saisissez vos informations";
  return null;
};

export const validateJobInputs = (j: JobInputs): string | null => {
  if (j.jobMode === "url" && !j.jobUrl.trim()) return "Saisissez une URL d'annonce";
  if (j.jobMode === "file" && !j.jobFile) return "Importez un fichier d'annonce";
  if (j.jobMode === "paste" && !j.jobText.trim()) return "Collez le contenu de l'annonce";
  return null;
};

export const LINKEDIN_BLOCKED_MESSAGE = "LinkedIn bloque l'extraction. Utilisez l'export PDF ou la saisie manuelle.";
