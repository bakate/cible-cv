/** Authentication lifecycle: bootstrap, OAuth callback exchange, session, logout. */
import { assign, emit, fromPromise, setup } from "xstate";

import type { User } from "../domain/types";
import type { Services } from "../ports";
import { navigateTo, type ShellEvent } from "./events";

export interface AuthContext {
  services: Services;
  sessionId: string | null;
  user: User | null;
}

export type AuthEvent = { type: "LOGIN" } | { type: "LOGOUT" } | { type: "RETRY" };

export const authMachine = setup({
  types: {
    context: {} as AuthContext,
    events: {} as AuthEvent,
    emitted: {} as ShellEvent,
    input: {} as { services: Services; sessionId?: string | null },
  },
  actors: {
    fetchMe: fromPromise<User, { services: Services }>(({ input }) => input.services.auth.me()),
    exchangeSession: fromPromise<User, { services: Services; sessionId: string }>(({ input }) =>
      input.services.auth.processSession(input.sessionId),
    ),
    logout: fromPromise<void, { services: Services }>(({ input }) => input.services.auth.logout()),
  },
  guards: {
    hasSessionId: ({ context }) => !!context.sessionId,
  },
}).createMachine({
  id: "auth",
  context: ({ input }) => ({ services: input.services, sessionId: input.sessionId ?? null, user: null }),
  initial: "boot",
  states: {
    boot: {
      always: [{ guard: "hasSessionId", target: "exchanging" }, { target: "checking" }],
    },
    checking: {
      invoke: {
        src: "fetchMe",
        input: ({ context }) => ({ services: context.services }),
        onDone: { target: "authenticated", actions: assign({ user: ({ event }) => event.output }) },
        onError: { target: "anonymous", actions: assign({ user: null }) },
      },
    },
    exchanging: {
      invoke: {
        src: "exchangeSession",
        input: ({ context }) => ({ services: context.services, sessionId: context.sessionId as string }),
        onDone: {
          target: "authenticated",
          actions: [assign({ user: ({ event }) => event.output, sessionId: null }), emit(navigateTo("/", true))],
        },
        onError: {
          target: "anonymous",
          actions: [assign({ user: null, sessionId: null }), emit(navigateTo("/login", true))],
        },
      },
    },
    authenticated: {
      on: { LOGOUT: "loggingOut" },
    },
    loggingOut: {
      invoke: {
        src: "logout",
        input: ({ context }) => ({ services: context.services }),
        onDone: { target: "anonymous", actions: assign({ user: null }) },
        onError: { target: "anonymous", actions: assign({ user: null }) },
      },
    },
    anonymous: {
      on: {
        LOGIN: { actions: ({ context }) => context.services.auth.startLogin() },
        RETRY: "checking",
      },
    },
  },
});

export type AuthSnapshot = ReturnType<(typeof authMachine)["getInitialSnapshot"]>;
export const selectAuthLoading = (s: { matches: (v: any) => boolean }) =>
  s.matches("boot") || s.matches("checking") || s.matches("exchanging");
