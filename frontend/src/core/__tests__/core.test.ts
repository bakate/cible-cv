import { createActor, waitFor, type AnyActorRef } from "xstate";

import { accentOf, appendAtPath, letterToPlainText, matchTokensOf, removeAtPath, setAtPath, textMatches } from "../domain/cv";
import { validateJobInputs, validateProfileInputs } from "../domain/wizard";
import { authMachine, selectAuthLoading } from "../machines/authMachine";
import type { ShellEvent } from "../machines/events";
import { atsMachine, historyMachine } from "../machines/listMachines";
import { previewMachine, selectMatchTokens } from "../machines/previewMachine";
import { selectWizardBusy, selectWizardStep, wizardMachine } from "../machines/wizardMachine";
import { buildFakeServices } from "../testing/fakeServices";

const collectShellEvents = (actor: AnyActorRef) => {
  const events: ShellEvent[] = [];
  actor.on("notify", (e: any) => events.push(e));
  actor.on("navigate", (e: any) => events.push(e));
  return events;
};
const settle = (actor: AnyActorRef, pred: (s: any) => boolean) => waitFor(actor, pred, { timeout: 2000 });
const idle = { profile: "idle" };

// ---------- domain ----------
describe("domain/cv", () => {
  test("path editing is immutable", () => {
    const cv = { experiences: [{ title: "A", bullets: ["x"] }] };
    const next = setAtPath(cv, ["experiences", 0, "title"], "B");
    expect(next.experiences[0].title).toBe("B");
    expect(cv.experiences[0].title).toBe("A");
    expect(appendAtPath(cv, ["experiences", 0, "bullets"], "y").experiences[0].bullets).toEqual(["x", "y"]);
    expect(removeAtPath(cv, ["experiences"], 0).experiences).toEqual([]);
    expect(setAtPath({}, ["theme", "accent"], "#000")).toEqual({ theme: { accent: "#000" } });
  });
  test("keyword matching is accent/case insensitive", () => {
    const tokens = matchTokensOf({ keywords_matched: ["Développement Python"], keywords_added: ["AWS"] });
    expect(textMatches("python 3", tokens)).toBe(true);
    expect(textMatches("Developpement", tokens)).toBe(true);
    expect(textMatches("Java", tokens)).toBe(false);
    expect(textMatches("Java", new Set())).toBe(false);
  });
  test("accent default and letter text", () => {
    expect(accentOf({})).toBe("#FF3E1A");
    expect(accentOf({ theme: { accent: "#000" } })).toBe("#000");
    expect(letterToPlainText({ subject: "S", recipient: "R", body: "B" })).toBe("S\n\nR\n\nB");
  });
});

describe("domain/wizard validation", () => {
  test("profile", () => {
    expect(validateProfileInputs({ profileMode: "pdf", profileFile: null, linkedinUrl: "", manualProfile: "" })).toMatch(/Importez/);
    expect(validateProfileInputs({ profileMode: "linkedin", profileFile: null, linkedinUrl: " ", manualProfile: "" })).toMatch(/LinkedIn/);
    expect(validateProfileInputs({ profileMode: "manual", profileFile: null, linkedinUrl: "", manualProfile: "ok" })).toBeNull();
  });
  test("job", () => {
    expect(validateJobInputs({ jobMode: "url", jobUrl: "", jobText: "", jobFile: null })).toMatch(/URL/);
    expect(validateJobInputs({ jobMode: "paste", jobUrl: "", jobText: "x", jobFile: null })).toBeNull();
  });
});

// ---------- auth ----------
describe("authMachine", () => {
  test("boots into authenticated when a session exists", async () => {
    const { services } = buildFakeServices();
    const actor = createActor(authMachine, { input: { services } }).start();
    expect(selectAuthLoading(actor.getSnapshot())).toBe(true);
    await settle(actor, (s) => s.matches("authenticated"));
    expect(actor.getSnapshot().context.user?.email).toBe("jane@x.io");
  });
  test("anonymous when /me fails; LOGIN delegates to gateway; LOGOUT clears user", async () => {
    const { services, state } = buildFakeServices({ me: null });
    const actor = createActor(authMachine, { input: { services } }).start();
    await settle(actor, (s) => s.matches("anonymous"));
    actor.send({ type: "LOGIN" });
    expect(state.calls).toContain("auth.startLogin");
    state.me = { user_id: "u1", email: "a@b.c", name: "A", role: "user" };
    actor.send({ type: "RETRY" });
    await settle(actor, (s) => s.matches("authenticated"));
    actor.send({ type: "LOGOUT" });
    await settle(actor, (s) => s.matches("anonymous"));
    expect(actor.getSnapshot().context.user).toBeNull();
  });
  test("OAuth callback exchanges the session and navigates home", async () => {
    const { services } = buildFakeServices({ me: null });
    const actor = createActor(authMachine, { input: { services, sessionId: "sess-1" } });
    const events = collectShellEvents(actor);
    actor.start();
    await settle(actor, (s) => s.matches("authenticated"));
    expect(events).toEqual([{ type: "navigate", to: "/", replace: true }]);
  });
  test("failed OAuth callback navigates to /login", async () => {
    const { services } = buildFakeServices({ me: null });
    const actor = createActor(authMachine, { input: { services, sessionId: "bad" } });
    const events = collectShellEvents(actor);
    actor.start();
    await settle(actor, (s) => s.matches("anonymous"));
    expect(events).toEqual([{ type: "navigate", to: "/login", replace: true }]);
  });
});

// ---------- wizard ----------
describe("wizardMachine", () => {
  const file = (name: string) => new File(["x"], name);

  test("validation blocks NEXT and notifies without calling gateways", async () => {
    const { services, state } = buildFakeServices();
    const actor = createActor(wizardMachine, { input: { services } });
    const events = collectShellEvents(actor);
    actor.start();
    actor.send({ type: "NEXT" });
    await settle(actor, (s) => s.matches(idle) && events.length > 0);
    expect(events[0]).toMatchObject({ type: "notify", level: "error", title: "Importez un fichier de profil" });
    expect(selectWizardStep(actor.getSnapshot())).toBe("profile");
    expect(state.calls.filter((c) => c.startsWith("parsing"))).toEqual([]);
  });

  test("happy path: pdf profile → pasted job → template → generate → navigate", async () => {
    const { services, state } = buildFakeServices();
    const actor = createActor(wizardMachine, { input: { services } });
    const events = collectShellEvents(actor);
    actor.start();
    actor.send({ type: "SET_PROFILE_FILE", file: file("cv.pdf") });
    actor.send({ type: "NEXT" });
    await settle(actor, (s) => s.matches("job"));
    expect(actor.getSnapshot().context.profileText).toContain("texte extrait du fichier");

    actor.send({ type: "SET_JOB_TEXT", value: "Offre collée" });
    actor.send({ type: "NEXT" });
    await settle(actor, (s) => s.matches("template"));
    expect(actor.getSnapshot().context.jobText).toBe("Offre collée");
    expect(state.calls).not.toContain(expect.stringContaining("parsing.parseUrl"));

    actor.send({ type: "SET_TEMPLATE", template: "startup" });
    actor.send({ type: "NEXT" });
    expect(selectWizardBusy(actor.getSnapshot())).toBe(true);
    await settle(actor, (s) => s.matches("done"));
    expect(state.calls).toContain("generations.generate:startup");
    expect(events.at(-1)).toEqual({ type: "navigate", to: "/preview/new1", replace: false });
    expect(events.some((e) => e.type === "notify" && e.title === "Documents générés !")).toBe(true);
  });

  test("linkedin failure is translated into a domain message", async () => {
    const { services } = buildFakeServices();
    const actor = createActor(wizardMachine, { input: { services } });
    const events = collectShellEvents(actor);
    actor.start();
    actor.send({ type: "SET_PROFILE_MODE", mode: "linkedin" });
    actor.send({ type: "SET_LINKEDIN_URL", value: "https://linkedin.com/in/x" });
    actor.send({ type: "NEXT" });
    await settle(actor, (s) => s.matches(idle) && events.length > 0);
    expect(events[0]).toMatchObject({ level: "error", title: expect.stringContaining("LinkedIn bloque") });
  });

  test("base profile: loaded on start, USE jumps to job, FORGET asks confirmation", async () => {
    const base = { profile_text: "base text", cv: {}, photo_data_url: "data:photo", updated_at: "now" };
    const { services, state } = buildFakeServices({ base, confirmAnswer: false });
    const actor = createActor(wizardMachine, { input: { services } }).start();
    await settle(actor, (s) => !!s.context.baseProfile);
    expect(actor.getSnapshot().context.photo).toBe("data:photo");

    actor.send({ type: "FORGET_BASE_PROFILE" });
    await settle(actor, (s) => s.matches(idle));
    expect(state.base).toEqual(base);

    actor.send({ type: "USE_BASE_PROFILE" });
    expect(selectWizardStep(actor.getSnapshot())).toBe("job");
    expect(actor.getSnapshot().context.profileText).toBe("base text");
    actor.send({ type: "BACK" });
    expect(selectWizardStep(actor.getSnapshot())).toBe("profile");
  });

  test("photo is read through the file port", async () => {
    const { services } = buildFakeServices();
    const actor = createActor(wizardMachine, { input: { services } }).start();
    actor.send({ type: "SET_PHOTO_FILE", file: file("me.png") });
    await settle(actor, (s) => s.context.photo !== "");
    expect(actor.getSnapshot().context.photo).toBe("data:image/png;base64,me.png");
    actor.send({ type: "CLEAR_PHOTO" });
    expect(actor.getSnapshot().context.photo).toBe("");
  });
});

// ---------- preview ----------
describe("previewMachine", () => {
  const boot = async (init = {}) => {
    const built = buildFakeServices(init);
    const actor = createActor(previewMachine, { input: { services: built.services, id: "g1" } });
    const events = collectShellEvents(actor);
    actor.start();
    await settle(actor, (s) => s.matches("ready") || s.matches("failed"));
    return { ...built, actor, events };
  };

  test("loads and derives match tokens", async () => {
    const { actor } = await boot();
    expect(actor.getSnapshot().context.data?.id).toBe("g1");
    expect([...selectMatchTokens(actor.getSnapshot())].sort()).toEqual(["cloud", "fastapi", "python"]);
  });

  test("missing generation → failed + error notification", async () => {
    const { actor, events } = await boot({ generations: {} });
    expect(actor.getSnapshot().matches("failed")).toBe(true);
    expect(events[0]).toMatchObject({ level: "error", title: "Génération introuvable" });
  });

  test("edit via paths then TOGGLE_EDIT saves cv+letter", async () => {
    const { actor, state, events } = await boot();
    actor.send({ type: "TOGGLE_EDIT" });
    expect(actor.getSnapshot().context.editing).toBe(true);
    actor.send({ type: "EDIT_SET", path: ["cv", "full_name"], value: "Jane Roe" });
    actor.send({ type: "EDIT_APPEND", path: ["cv", "experiences"], kind: "experience" });
    actor.send({ type: "EDIT_REMOVE", path: ["cv", "experiences", 0, "bullets"], index: 0 });
    actor.send({ type: "EDIT_SET", path: ["letter", "body"], value: "Nouveau corps" });
    const cv = actor.getSnapshot().context.data!.cv;
    expect(cv.full_name).toBe("Jane Roe");
    expect(cv.experiences).toHaveLength(2);
    expect(cv.experiences![0].bullets).toEqual([]);
    actor.send({ type: "TOGGLE_EDIT" });
    await settle(actor, (s) => s.matches({ ready: "idle" }) && !s.context.editing);
    expect(state.calls).toContain("generations.update:g1:cv,letter");
    expect(state.generations.g1.letter.body).toBe("Nouveau corps");
    expect(events.at(-1)).toMatchObject({ level: "success", title: "Modifications enregistrées" });
  });

  test("export builds the right URL from tab + layout; copy uses clipboard", async () => {
    const { actor, state } = await boot();
    actor.send({ type: "SET_PDF_LAYOUT", layout: "two-col" });
    actor.send({ type: "EXPORT", format: "pdf" });
    actor.send({ type: "EXPORT", format: "docx" });
    actor.send({ type: "SET_TAB", tab: "letter" });
    actor.send({ type: "EXPORT", format: "pdf" });
    expect(state.opened).toEqual(["/cv/g1.pdf?layout=two-col", "/cv/g1.docx", "/letter/g1.pdf"]);
    actor.send({ type: "COPY_LETTER" });
    await settle(actor, (s) => s.matches({ ready: "idle" }) && state.clipboard.length === 1);
    expect(state.clipboard[0]).toBe("Candidature\n\nMadame,\n\nBonjour");
  });

  test("template switch is optimistic and persisted; pin saves base profile", async () => {
    const { actor, state } = await boot();
    actor.send({ type: "SET_TEMPLATE", template: "startup" });
    expect(actor.getSnapshot().context.data?.template).toBe("startup");
    await settle(actor, (s) => s.matches({ ready: "idle" }));
    expect(state.calls).toContain("generations.update:g1:template");
    actor.send({ type: "PIN_AS_BASE" });
    await settle(actor, (s) => s.matches({ ready: "idle" }) && !!state.base);
    expect(state.base?.profile_text).toBe("p".repeat(60));
  });

  test("delete: cancelled confirmation does nothing; confirmed deletes and navigates", async () => {
    const cancelled = await boot({ confirmAnswer: false });
    cancelled.actor.send({ type: "DELETE" });
    await settle(cancelled.actor, (s) => s.matches({ ready: "idle" }));
    expect(cancelled.state.generations.g1).toBeDefined();

    const { actor, state, events } = await boot();
    actor.send({ type: "DELETE" });
    await settle(actor, (s) => s.matches("deleted"));
    expect(state.generations.g1).toBeUndefined();
    expect(events.at(-1)).toEqual({ type: "navigate", to: "/history", replace: false });
  });

  test("regroup skills replaces skill_groups", async () => {
    const { actor, events } = await boot();
    actor.send({ type: "REGROUP_SKILLS" });
    await settle(actor, (s) => s.matches({ ready: "idle" }) && !!s.context.data?.cv.skill_groups);
    expect(actor.getSnapshot().context.data?.cv.skill_groups).toEqual([{ category: "Backend", items: ["Python"] }]);
    expect(events.at(-1)).toMatchObject({ title: "Compétences regroupées par famille" });
  });
});

// ---------- lists ----------
describe("history & ats machines", () => {
  test("history lists summaries", async () => {
    const { services } = buildFakeServices();
    const actor = createActor(historyMachine, { input: { services } }).start();
    await settle(actor, (s) => s.matches("ready"));
    expect(actor.getSnapshot().context.items?.[0]).toMatchObject({ id: "g1", match_score: 80 });
  });
  test("ats reports score", async () => {
    const { services } = buildFakeServices();
    const actor = createActor(atsMachine, { input: { services, generationId: "g1" } }).start();
    await settle(actor, (s) => s.matches("done"));
    expect(actor.getSnapshot().context.report?.score).toBe(72);
  });
});
