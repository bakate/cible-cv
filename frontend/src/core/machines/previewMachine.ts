/** Preview: load a generation, edit it (path-based, immutable), persist, export, pin, delete. */
import { assign, emit, fromPromise, setup } from "xstate";

import {
  accentOf,
  appendAtPath,
  blankEntry,
  letterToPlainText,
  matchTokensOf,
  removeAtPath,
  setAtPath,
  type BlankKind,
  type Path,
} from "../domain/cv";
import type { DocumentKind, ExportFormat, Generation, PdfLayout, SkillGroup, Template } from "../domain/types";
import { errorMessage, type Services } from "../ports";
import { navigateTo, notify, type ShellEvent } from "./events";

export interface PreviewContext {
  services: Services;
  id: string;
  data: Generation | null;
  tab: DocumentKind;
  editing: boolean;
  highlight: boolean;
  pdfLayout: PdfLayout;
  atsOpen: boolean;
  error: string | null;
}

export type PreviewEvent =
  | { type: "SET_TAB"; tab: DocumentKind }
  | { type: "TOGGLE_EDIT" }
  | { type: "TOGGLE_HIGHLIGHT" }
  | { type: "SET_PDF_LAYOUT"; layout: PdfLayout }
  | { type: "OPEN_ATS" }
  | { type: "CLOSE_ATS" }
  | { type: "SET_TEMPLATE"; template: Template }
  | { type: "EXPORT"; format: ExportFormat }
  | { type: "COPY_LETTER" }
  | { type: "PIN_AS_BASE" }
  | { type: "DELETE" }
  | { type: "EDIT_SET"; path: Path; value: unknown }
  | { type: "EDIT_APPEND"; path: Path; kind: BlankKind }
  | { type: "EDIT_REMOVE"; path: Path; index: number }
  | { type: "REGROUP_SKILLS" };

const exportUrl = (ctx: PreviewContext, format: ExportFormat): string => {
  const { exports } = ctx.services;
  if (ctx.tab === "cv") return format === "pdf" ? exports.cvPdfUrl(ctx.id, ctx.pdfLayout) : exports.cvDocxUrl(ctx.id);
  return format === "pdf" ? exports.letterPdfUrl(ctx.id) : exports.letterDocxUrl(ctx.id);
};

const withData = (ctx: PreviewContext, fn: (d: Generation) => Generation): Generation | null => (ctx.data ? fn(ctx.data) : null);

export const previewMachine = setup({
  types: {
    context: {} as PreviewContext,
    events: {} as PreviewEvent,
    emitted: {} as ShellEvent,
    input: {} as { services: Services; id: string },
  },
  actors: {
    load: fromPromise<Generation, { services: Services; id: string }>(({ input }) => input.services.generations.get(input.id)),
    save: fromPromise<Generation, PreviewContext>(({ input }) =>
      input.services.generations.update(input.id, { cv: input.data?.cv, letter: input.data?.letter }),
    ),
    switchTemplate: fromPromise<Generation, { services: Services; id: string; template: Template }>(({ input }) =>
      input.services.generations.update(input.id, { template: input.template }),
    ),
    pin: fromPromise<void, PreviewContext>(({ input }) =>
      input.services.profile.saveBase({
        profile_text: input.data?.profile_text || "",
        cv: input.data?.cv || {},
        photo_data_url: input.data?.photo_data_url,
      }),
    ),
    remove: fromPromise<boolean, PreviewContext>(async ({ input }) => {
      const ok = await input.services.confirmer.confirm("Supprimer cette génération ?");
      if (ok) await input.services.generations.remove(input.id);
      return ok;
    }),
    copyLetter: fromPromise<void, PreviewContext>(({ input }) =>
      input.services.clipboard.write(letterToPlainText(input.data?.letter)),
    ),
    regroup: fromPromise<SkillGroup[], PreviewContext>(({ input }) =>
      input.services.analysis.regroupSkills({ skills: input.data?.cv.skills || [], tools: input.data?.cv.tools || [] }),
    ),
  },
  actions: {
    notifyError: emit(({ event }) => notify("error", errorMessage((event as any).error))),
  },
  guards: {
    isEditing: ({ context }) => context.editing,
    hasSkillsToRegroup: ({ context }) => (context.data?.cv.skills?.length || 0) + (context.data?.cv.tools?.length || 0) > 0,
  },
}).createMachine({
  id: "preview",
  context: ({ input }) => ({
    services: input.services,
    id: input.id,
    data: null,
    tab: "cv",
    editing: false,
    highlight: false,
    pdfLayout: "single",
    atsOpen: false,
    error: null,
  }),
  initial: "loading",
  states: {
    loading: {
      invoke: {
        src: "load",
        input: ({ context }) => ({ services: context.services, id: context.id }),
        onDone: { target: "ready", actions: assign({ data: ({ event }) => event.output }) },
        onError: {
          target: "failed",
          actions: [assign({ error: ({ event }) => errorMessage(event.error) }), "notifyError"],
        },
      },
    },
    failed: {},
    ready: {
      initial: "idle",
      on: {
        SET_TAB: { actions: assign({ tab: ({ event }) => event.tab }) },
        TOGGLE_HIGHLIGHT: { actions: assign({ highlight: ({ context }) => !context.highlight }) },
        SET_PDF_LAYOUT: { actions: assign({ pdfLayout: ({ event }) => event.layout }) },
        OPEN_ATS: { actions: assign({ atsOpen: true }) },
        CLOSE_ATS: { actions: assign({ atsOpen: false }) },
        EXPORT: {
          actions: [
            ({ context, event }) => context.services.downloader.open(exportUrl(context, event.format)),
            emit(({ event }) => notify("success", `${event.format.toUpperCase()} en cours de téléchargement`)),
          ],
        },
        EDIT_SET: {
          actions: assign({ data: ({ context, event }) => withData(context, (d) => setAtPath(d, event.path, event.value)) }),
        },
        EDIT_APPEND: {
          actions: assign({
            data: ({ context, event }) => withData(context, (d) => appendAtPath(d, event.path, blankEntry[event.kind]())),
          }),
        },
        EDIT_REMOVE: {
          actions: assign({ data: ({ context, event }) => withData(context, (d) => removeAtPath(d, event.path, event.index)) }),
        },
      },
      states: {
        idle: {
          on: {
            TOGGLE_EDIT: [{ guard: "isEditing", target: "saving" }, { actions: assign({ editing: true }) }],
            SET_TEMPLATE: {
              target: "switchingTemplate",
              actions: assign({ data: ({ context, event }) => withData(context, (d) => ({ ...d, template: event.template })) }),
            },
            COPY_LETTER: "copying",
            PIN_AS_BASE: "pinning",
            DELETE: "deleting",
            REGROUP_SKILLS: { guard: "hasSkillsToRegroup", target: "regrouping" },
          },
        },
        saving: {
          invoke: {
            src: "save",
            input: ({ context }) => context,
            onDone: { target: "idle", actions: [assign({ editing: false }), emit(notify("success", "Modifications enregistrées"))] },
            onError: { target: "idle", actions: emit(notify("error", "Échec de la sauvegarde")) },
          },
        },
        switchingTemplate: {
          invoke: {
            src: "switchTemplate",
            input: ({ context }) => ({ services: context.services, id: context.id, template: context.data?.template || "corporate" }),
            onDone: "idle",
            onError: "idle",
          },
        },
        copying: {
          invoke: {
            src: "copyLetter",
            input: ({ context }) => context,
            onDone: { target: "idle", actions: emit(notify("success", "Lettre copiée")) },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
        pinning: {
          invoke: {
            src: "pin",
            input: ({ context }) => context,
            onDone: {
              target: "idle",
              actions: emit(notify("success", "CV de base mis à jour", "Tu pourras le réutiliser à chaque nouvelle candidature.")),
            },
            onError: { target: "idle", actions: emit(notify("error", "Échec de la sauvegarde")) },
          },
        },
        deleting: {
          invoke: {
            src: "remove",
            input: ({ context }) => context,
            onDone: [
              { guard: ({ event }) => event.output, target: "#preview.deleted", actions: [emit(notify("success", "Supprimé")), emit(navigateTo("/history"))] },
              { target: "idle" },
            ],
            onError: { target: "idle", actions: "notifyError" },
          },
        },
        regrouping: {
          invoke: {
            src: "regroup",
            input: ({ context }) => context,
            onDone: {
              target: "idle",
              actions: [
                assign({ data: ({ context, event }) => withData(context, (d) => setAtPath(d, ["cv", "skill_groups"], event.output)) }),
                emit(notify("success", "Compétences regroupées par famille")),
              ],
            },
            onError: { target: "idle", actions: "notifyError" },
          },
        },
      },
    },
    deleted: { type: "final" },
  },
});

type Snap = { context: PreviewContext; matches: (v: any) => boolean };
export const selectMatchTokens = (s: Snap) => matchTokensOf(s.context.data?.adaptations);
export const selectAccent = (s: Snap) => accentOf(s.context.data?.cv);
export const selectMatchScore = (s: Snap) => s.context.data?.adaptations.match_score || 0;
export const selectRegrouping = (s: Snap) => s.matches({ ready: "regrouping" });
export const selectBusy = (s: Snap) => s.matches("ready") && !s.matches({ ready: "idle" });
