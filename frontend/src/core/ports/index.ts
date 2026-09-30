/** Ports — what the core needs from the outside world. Implemented in `infrastructure/`. */
import type {
  AtsReport,
  BaseProfile,
  GenerateInput,
  Generation,
  GenerationPatch,
  GenerationSummary,
  PdfLayout,
  SkillGroup,
  User,
} from "../domain/types";

/** Normalized error raised by every gateway; `message` is user-displayable (French). */
export class GatewayError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GatewayError";
  }
}

export const errorMessage = (e: unknown, fallback = "Erreur"): string =>
  e instanceof Error && e.message ? e.message : fallback;

export interface AuthGateway {
  me(): Promise<User>;
  processSession(sessionId: string): Promise<User>;
  logout(): Promise<void>;
  startLogin(): void;
}

export interface ParsingGateway {
  parseFile(file: File): Promise<string>;
  parseUrl(url: string): Promise<string>;
}

export interface GenerationGateway {
  generate(input: GenerateInput): Promise<Generation>;
  list(): Promise<GenerationSummary[]>;
  get(id: string): Promise<Generation>;
  update(id: string, patch: GenerationPatch): Promise<Generation>;
  remove(id: string): Promise<void>;
}

export interface ProfileGateway {
  getBase(): Promise<BaseProfile | null>;
  saveBase(payload: { profile_text: string; cv: Generation["cv"]; photo_data_url?: string | null }): Promise<void>;
  deleteBase(): Promise<void>;
}

export interface AnalysisGateway {
  regroupSkills(payload: { skills: string[]; tools: string[] }): Promise<SkillGroup[]>;
  atsCheck(generationId: string): Promise<AtsReport>;
}

export interface ExportGateway {
  cvPdfUrl(id: string, layout: PdfLayout): string;
  letterPdfUrl(id: string): string;
  cvDocxUrl(id: string): string;
  letterDocxUrl(id: string): string;
}

export interface Downloader {
  open(url: string): void;
}

export interface ClipboardPort {
  write(text: string): Promise<void>;
}

export interface Confirmer {
  confirm(message: string): Promise<boolean>;
}

export interface FileReaderPort {
  readAsDataUrl(file: File): Promise<string>;
}

export interface Services {
  auth: AuthGateway;
  parsing: ParsingGateway;
  generations: GenerationGateway;
  profile: ProfileGateway;
  analysis: AnalysisGateway;
  exports: ExportGateway;
  downloader: Downloader;
  clipboard: ClipboardPort;
  confirmer: Confirmer;
  files: FileReaderPort;
}
