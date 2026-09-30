/** In-memory Services implementation for machine tests — no HTTP, no DOM APIs. */
import type { Services } from "../ports";
import type { Generation, GenerationSummary, BaseProfile, User } from "../domain/types";

export const fakeUser: User = { user_id: "u1", email: "jane@x.io", name: "Jane", role: "admin" };

export const fakeGeneration = (over: Partial<Generation> = {}): Generation => ({
  id: "g1",
  title: "Dev — Acme",
  company: "Acme",
  position: "Dev",
  template: "corporate",
  profile_text: "p".repeat(60),
  job_text: "j".repeat(60),
  cv: { full_name: "Jane Doe", skills: ["Python"], tools: [], experiences: [{ title: "Dev", bullets: ["a"] }] },
  letter: { subject: "Candidature", recipient: "Madame,", body: "Bonjour" },
  adaptations: { match_score: 80, keywords_matched: ["Python FastAPI"], keywords_added: ["Cloud"] },
  created_at: "2026-05-01T00:00:00Z",
  ...over,
});

export interface FakeState {
  me: User | null;
  base: BaseProfile | null;
  generations: Record<string, Generation>;
  confirmAnswer: boolean;
  calls: string[];
  opened: string[];
  clipboard: string[];
  failParse?: boolean;
}

export const buildFakeServices = (init: Partial<FakeState> = {}): { services: Services; state: FakeState } => {
  const state: FakeState = {
    me: fakeUser,
    base: null,
    generations: { g1: fakeGeneration() },
    confirmAnswer: true,
    calls: [],
    opened: [],
    clipboard: [],
    ...init,
  };
  const log = (s: string) => state.calls.push(s);

  const services: Services = {
    auth: {
      me: async () => {
        log("auth.me");
        if (!state.me) throw new Error("Non authentifié");
        return state.me;
      },
      processSession: async (sid) => {
        log(`auth.processSession:${sid}`);
        if (sid === "bad") throw new Error("OAuth fetch failed");
        state.me = fakeUser;
        return fakeUser;
      },
      logout: async () => {
        log("auth.logout");
        state.me = null;
      },
      startLogin: () => log("auth.startLogin"),
    },
    parsing: {
      parseFile: async (file) => {
        log(`parsing.parseFile:${file.name}`);
        if (state.failParse) throw new Error("Lecture du fichier impossible");
        return "texte extrait du fichier ".repeat(4);
      },
      parseUrl: async (url) => {
        log(`parsing.parseUrl:${url}`);
        if (url.includes("linkedin")) throw new Error("blocked");
        return "texte extrait de l'url ".repeat(4);
      },
    },
    generations: {
      generate: async (input) => {
        log(`generations.generate:${input.template}`);
        const g = fakeGeneration({ id: "new1", template: input.template, profile_text: input.profile_text, job_text: input.job_text });
        state.generations[g.id] = g;
        return g;
      },
      list: async () => {
        log("generations.list");
        return Object.values(state.generations).map<GenerationSummary>((g) => ({ ...g, match_score: g.adaptations.match_score || 0 }));
      },
      get: async (id) => {
        log(`generations.get:${id}`);
        const g = state.generations[id];
        if (!g) throw new Error("Génération introuvable");
        return g;
      },
      update: async (id, patch) => {
        log(`generations.update:${id}:${Object.keys(patch).join(",")}`);
        state.generations[id] = { ...state.generations[id], ...(patch as Partial<Generation>) };
        return state.generations[id];
      },
      remove: async (id) => {
        log(`generations.remove:${id}`);
        delete state.generations[id];
      },
    },
    profile: {
      getBase: async () => {
        log("profile.getBase");
        return state.base;
      },
      saveBase: async (p) => {
        log("profile.saveBase");
        state.base = { profile_text: p.profile_text, cv: p.cv, photo_data_url: p.photo_data_url, updated_at: "now" };
      },
      deleteBase: async () => {
        log("profile.deleteBase");
        state.base = null;
      },
    },
    analysis: {
      regroupSkills: async () => {
        log("analysis.regroupSkills");
        return [{ category: "Backend", items: ["Python"] }];
      },
      atsCheck: async (id) => {
        log(`analysis.atsCheck:${id}`);
        return { score: 72, verdict: "bon" };
      },
    },
    exports: {
      cvPdfUrl: (id, layout) => `/cv/${id}.pdf?layout=${layout}`,
      letterPdfUrl: (id) => `/letter/${id}.pdf`,
      cvDocxUrl: (id) => `/cv/${id}.docx`,
      letterDocxUrl: (id) => `/letter/${id}.docx`,
    },
    downloader: { open: (url) => void state.opened.push(url) },
    clipboard: { write: async (t) => void state.clipboard.push(t) },
    confirmer: { confirm: async () => state.confirmAnswer },
    files: { readAsDataUrl: async (f) => `data:image/png;base64,${f.name}` },
  };
  return { services, state };
};
