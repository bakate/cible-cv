/** Wizard: profile → job → template → generation. Owns every step/transition rule. */
import { assign, emit, fromPromise, setup } from "xstate";

import type { BaseProfile, Generation, JobMode, ProfileMode, Template } from "../domain/types";
import {
  LINKEDIN_BLOCKED_MESSAGE,
  validateJobInputs,
  validateProfileInputs,
  type WizardStep,
} from "../domain/wizard";
import { errorMessage, type Services } from "../ports";
import { navigateTo, notify, type ShellEvent } from "./events";

export interface WizardContext {
  services: Services;
  profileMode: ProfileMode;
  profileFile: File | null;
  linkedinUrl: string;
  manualProfile: string;
  profileText: string;
  photo: string;
  baseProfile: BaseProfile | null;
  jobMode: JobMode;
  jobUrl: string;
  jobText: string;
  jobFile: File | null;
  template: Template;
}

export type WizardEvent =
  | { type: "SET_PROFILE_MODE"; mode: ProfileMode }
  | { type: "SET_PROFILE_FILE"; file: File | null }
  | { type: "SET_LINKEDIN_URL"; value: string }
  | { type: "SET_MANUAL_PROFILE"; value: string }
  | { type: "SET_PHOTO_FILE"; file: File | null }
  | { type: "CLEAR_PHOTO" }
  | { type: "USE_BASE_PROFILE" }
  | { type: "FORGET_BASE_PROFILE" }
  | { type: "SET_JOB_MODE"; mode: JobMode }
  | { type: "SET_JOB_URL"; value: string }
  | { type: "SET_JOB_TEXT"; value: string }
  | { type: "SET_JOB_FILE"; file: File | null }
  | { type: "SET_TEMPLATE"; template: Template }
  | { type: "NEXT" }
  | { type: "BACK" };

const resolveProfile = async (ctx: WizardContext): Promise<string> => {
  const error = validateProfileInputs(ctx);
  if (error) throw new Error(error);
  if (ctx.profileMode === "pdf") return ctx.services.parsing.parseFile(ctx.profileFile as File);
  if (ctx.profileMode === "linkedin") {
    try {
      return await ctx.services.parsing.parseUrl(ctx.linkedinUrl);
    } catch {
      throw new Error(LINKEDIN_BLOCKED_MESSAGE);
    }
  }
  return ctx.manualProfile;
};

const resolveJob = async (ctx: WizardContext): Promise<string> => {
  const error = validateJobInputs(ctx);
  if (error) throw new Error(error);
  if (ctx.jobMode === "url") return ctx.services.parsing.parseUrl(ctx.jobUrl);
  if (ctx.jobMode === "file") return ctx.services.parsing.parseFile(ctx.jobFile as File);
  return ctx.jobText;
};

export const wizardMachine = setup({
  types: {
    context: {} as WizardContext,
    events: {} as WizardEvent,
    emitted: {} as ShellEvent,
    input: {} as { services: Services },
  },
  actors: {
    loadBaseProfile: fromPromise<BaseProfile | null, { services: Services }>(({ input }) => input.services.profile.getBase()),
    resolveProfile: fromPromise<string, WizardContext>(({ input }) => resolveProfile(input)),
    resolveJob: fromPromise<string, WizardContext>(({ input }) => resolveJob(input)),
    readPhoto: fromPromise<string, { services: Services; file: File }>(({ input }) => input.services.files.readAsDataUrl(input.file)),
    forgetBaseProfile: fromPromise<boolean, { services: Services }>(async ({ input }) => {
      const ok = await input.services.confirmer.confirm("Oublier le CV de base ?");
      if (ok) await input.services.profile.deleteBase();
      return ok;
    }),
    generate: fromPromise<Generation, WizardContext>(({ input }) =>
      input.services.generations.generate({
        profile_text: input.profileText,
        job_text: input.jobText,
        template: input.template,
        photo_data_url: input.photo || null,
      }),
    ),
  },
  actions: {
    notifyError: emit(({ event }) => notify("error", errorMessage((event as any).error))),
  },
  guards: {
    hasBaseProfile: ({ context }) => !!context.baseProfile,
    hasPhotoFile: ({ event }) => event.type === "SET_PHOTO_FILE" && !!event.file,
  },
}).createMachine({
  id: "wizard",
  context: ({ input }) => ({
    services: input.services,
    profileMode: "pdf",
    profileFile: null,
    linkedinUrl: "",
    manualProfile: "",
    profileText: "",
    photo: "",
    baseProfile: null,
    jobMode: "paste",
    jobUrl: "",
    jobText: "",
    jobFile: null,
    template: "corporate",
  }),
  invoke: {
    src: "loadBaseProfile",
    input: ({ context }) => ({ services: context.services }),
    onDone: {
      actions: assign({
        baseProfile: ({ event }) => event.output,
        photo: ({ context, event }) => event.output?.photo_data_url || context.photo,
      }),
    },
  },
  initial: "profile",
  states: {
    profile: {
      initial: "idle",
      states: {
        idle: {
          on: {
            SET_PROFILE_MODE: { actions: assign({ profileMode: ({ event }) => event.mode }) },
            SET_PROFILE_FILE: { actions: assign({ profileFile: ({ event }) => event.file }) },
            SET_LINKEDIN_URL: { actions: assign({ linkedinUrl: ({ event }) => event.value }) },
            SET_MANUAL_PROFILE: { actions: assign({ manualProfile: ({ event }) => event.value }) },
            SET_PHOTO_FILE: [{ guard: "hasPhotoFile", target: "readingPhoto" }, { actions: assign({ photo: "" }) }],
            CLEAR_PHOTO: { actions: assign({ photo: "" }) },
            USE_BASE_PROFILE: {
              guard: "hasBaseProfile",
              target: "#wizard.job",
              actions: [
                assign({ profileText: ({ context }) => context.baseProfile?.profile_text || "" }),
                emit(notify("success", "CV de base chargé", "Passe directement à l'offre d'emploi.")),
              ],
            },
            FORGET_BASE_PROFILE: { guard: "hasBaseProfile", target: "forgettingBase" },
            NEXT: "resolving",
          },
        },
        readingPhoto: {
          invoke: {
            src: "readPhoto",
            input: ({ context, event }) => ({ services: context.services, file: (event as any).file as File }),
            onDone: { target: "idle", actions: assign({ photo: ({ event }) => event.output }) },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
        forgettingBase: {
          invoke: {
            src: "forgetBaseProfile",
            input: ({ context }) => ({ services: context.services }),
            onDone: [
              {
                guard: ({ event }) => event.output,
                target: "idle",
                actions: [assign({ baseProfile: null }), emit(notify("success", "CV de base supprimé"))],
              },
              { target: "idle" },
            ],
            onError: { target: "idle", actions: "notifyError" },
          },
        },
        resolving: {
          invoke: {
            src: "resolveProfile",
            input: ({ context }) => context,
            onDone: {
              target: "#wizard.job",
              actions: [
                assign({ profileText: ({ event }) => event.output }),
                emit(({ event }) => notify("success", "Profil prêt", `${event.output.length} caractères extraits`)),
              ],
            },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
      },
    },
    job: {
      initial: "idle",
      states: {
        idle: {
          on: {
            SET_JOB_MODE: { actions: assign({ jobMode: ({ event }) => event.mode }) },
            SET_JOB_URL: { actions: assign({ jobUrl: ({ event }) => event.value }) },
            SET_JOB_TEXT: { actions: assign({ jobText: ({ event }) => event.value }) },
            SET_JOB_FILE: { actions: assign({ jobFile: ({ event }) => event.file }) },
            BACK: "#wizard.profile",
            NEXT: "resolving",
          },
        },
        resolving: {
          invoke: {
            src: "resolveJob",
            input: ({ context }) => context,
            onDone: {
              target: "#wizard.template",
              actions: [
                assign({ jobText: ({ event }) => event.output }),
                emit(({ event }) => notify("success", "Annonce prête", `${event.output.length} caractères extraits`)),
              ],
            },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
      },
    },
    template: {
      initial: "idle",
      states: {
        idle: {
          on: {
            SET_TEMPLATE: { actions: assign({ template: ({ event }) => event.template }) },
            BACK: "#wizard.job",
            NEXT: "generating",
          },
        },
        generating: {
          entry: emit(notify("info", "Génération en cours…", "Claude analyse votre profil et l'offre")),
          invoke: {
            src: "generate",
            input: ({ context }) => context,
            onDone: {
              target: "#wizard.done",
              actions: [emit(notify("success", "Documents générés !")), emit(({ event }) => navigateTo(`/preview/${event.output.id}`))],
            },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
      },
    },
    done: { type: "final" },
  },
});

type Matcher = { matches: (v: any) => boolean };
export const selectWizardStep = (s: Matcher): WizardStep =>
  s.matches("job") ? "job" : s.matches("template") || s.matches("done") ? "template" : "profile";
export const selectWizardBusy = (s: Matcher): boolean =>
  s.matches({ profile: "resolving" }) ||
  s.matches({ profile: "readingPhoto" }) ||
  s.matches({ profile: "forgettingBase" }) ||
  s.matches({ job: "resolving" }) ||
  s.matches({ template: "generating" }) ||
  s.matches("done");
