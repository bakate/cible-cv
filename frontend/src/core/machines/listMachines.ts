/** History list + ATS audit machines (small, load-once flows). */
import { assign, fromPromise, setup } from "xstate";

import type { AtsReport, GenerationSummary } from "../domain/types";
import { errorMessage, type Services } from "../ports";

export const historyMachine = setup({
  types: {
    context: {} as { services: Services; items: GenerationSummary[] | null },
    input: {} as { services: Services },
  },
  actors: {
    list: fromPromise<GenerationSummary[], { services: Services }>(({ input }) => input.services.generations.list()),
  },
}).createMachine({
  id: "history",
  context: ({ input }) => ({ services: input.services, items: null }),
  initial: "loading",
  states: {
    loading: {
      invoke: {
        src: "list",
        input: ({ context }) => ({ services: context.services }),
        onDone: { target: "ready", actions: assign({ items: ({ event }) => event.output }) },
        onError: { target: "ready", actions: assign({ items: [] }) },
      },
    },
    ready: {},
  },
});

export const atsMachine = setup({
  types: {
    context: {} as { services: Services; generationId: string; report: AtsReport | null; error: string | null },
    input: {} as { services: Services; generationId: string },
  },
  actors: {
    check: fromPromise<AtsReport, { services: Services; generationId: string }>(({ input }) =>
      input.services.analysis.atsCheck(input.generationId),
    ),
  },
}).createMachine({
  id: "ats",
  context: ({ input }) => ({ services: input.services, generationId: input.generationId, report: null, error: null }),
  initial: "checking",
  states: {
    checking: {
      invoke: {
        src: "check",
        input: ({ context }) => ({ services: context.services, generationId: context.generationId }),
        onDone: { target: "done", actions: assign({ report: ({ event }) => event.output }) },
        onError: {
          target: "failed",
          actions: assign({ error: ({ event }) => errorMessage(event.error, "Échec de l'analyse") }),
        },
      },
    },
    done: {},
    failed: {},
  },
});
