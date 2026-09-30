/** Pure CV business rules: accent, keyword matching, immutable editing, letter text. */
import type { Adaptations, Cv, Letter } from "./types";

export const DEFAULT_ACCENT = "#FF3E1A";
export const ACCENT_PRESETS = ["#FF3E1A", "#0EA5E9", "#10B981", "#8B5CF6", "#0A0A0A", "#D97706"];

export const accentOf = (cv?: Cv | null): string => cv?.theme?.accent || DEFAULT_ACCENT;

// ---------- keyword matching ----------
const normalize = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const tokenize = (s: string): string[] => normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

export const matchTokensOf = (adaptations?: Adaptations | null): Set<string> => {
  const set = new Set<string>();
  [...(adaptations?.keywords_matched || []), ...(adaptations?.keywords_added || [])].forEach((k) =>
    tokenize(k).forEach((t) => set.add(t)),
  );
  return set;
};

export const textMatches = (text: string, tokens?: Set<string> | null): boolean =>
  !!tokens && tokens.size > 0 && tokenize(text).some((t) => tokens.has(t));

// ---------- letter ----------
export const letterToPlainText = (letter?: Letter | null): string =>
  `${letter?.subject ? letter.subject + "\n\n" : ""}${letter?.recipient || ""}\n\n${letter?.body || ""}`;

// ---------- immutable path editing ----------
export type Path = (string | number)[];

const clone = (v: unknown): any => (Array.isArray(v) ? [...v] : v && typeof v === "object" ? { ...(v as object) } : v);

export const setAtPath = <T>(obj: T, path: Path, value: unknown): T => {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const next = clone(obj) ?? (typeof head === "number" ? [] : {});
  next[head] = setAtPath(next[head], rest, value);
  return next;
};

export const getAtPath = (obj: unknown, path: Path): any =>
  path.reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);

export const appendAtPath = <T>(obj: T, path: Path, item: unknown): T =>
  setAtPath(obj, path, [...((getAtPath(obj, path) as unknown[]) || []), item]);

export const removeAtPath = <T>(obj: T, path: Path, index: number): T =>
  setAtPath(obj, path, ((getAtPath(obj, path) as unknown[]) || []).filter((_, i) => i !== index));

// ---------- blank entries ----------
const newUid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const blankEntry = {
  experience: () => ({ _uid: newUid(), title: "", company: "", location: "", start: "", end: "", bullets: [] as string[] }),
  education: () => ({ _uid: newUid(), degree: "", school: "", start: "", end: "", details: "" }),
  skillGroup: () => ({ _uid: newUid(), category: "", items: [] as string[] }),
  language: () => ({ _uid: newUid(), name: "", level: "" }),
  certification: () => ({ _uid: newUid(), name: "", issuer: "", year: "" }),
  text: () => "",
};

export type BlankKind = keyof typeof blankEntry;

export const hasSkillsToRegroup = (cv?: Cv | null): boolean =>
  (cv?.skills?.length || 0) + (cv?.tools?.length || 0) > 0;
