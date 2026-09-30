/** Domain types — mirror the backend contracts, framework-free. */

export interface Contact {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
}

export interface Experience {
  _uid?: string;
  title?: string;
  company?: string;
  location?: string;
  start?: string;
  end?: string;
  bullets?: string[];
}

export interface Education {
  _uid?: string;
  degree?: string;
  school?: string;
  start?: string;
  end?: string;
  details?: string | null;
}

export interface SkillGroup {
  _uid?: string;
  category?: string;
  items?: string[];
}

export interface Language {
  _uid?: string;
  name?: string;
  level?: string;
}

export interface Certification {
  _uid?: string;
  name?: string;
  issuer?: string;
  year?: string;
}

export interface Cv {
  full_name?: string;
  headline?: string;
  contact?: Contact;
  summary?: string;
  skill_groups?: SkillGroup[];
  skills?: string[];
  tools?: string[];
  languages?: Language[];
  experiences?: Experience[];
  education?: Education[];
  certifications?: Certification[];
  interests?: string[];
  theme?: { accent?: string };
}

export interface Letter {
  recipient?: string;
  subject?: string;
  body?: string;
}

export interface Adaptations {
  position?: string;
  company?: string;
  keywords_matched?: string[];
  keywords_added?: string[];
  experiences_highlighted?: string[];
  match_score?: number;
}

export type Template = "corporate" | "startup";
export type PdfLayout = "single" | "two-col";
export type DocumentKind = "cv" | "letter";
export type ExportFormat = "pdf" | "docx";

export interface Generation {
  id: string;
  user_id?: string;
  title: string;
  company: string;
  position: string;
  template: Template;
  profile_text: string;
  job_text: string;
  cv: Cv;
  letter: Letter;
  adaptations: Adaptations;
  photo_data_url?: string | null;
  created_at: string;
}

export interface GenerationSummary {
  id: string;
  title: string;
  company: string;
  position: string;
  template: Template;
  created_at: string;
  match_score: number;
}

export interface GenerationPatch {
  cv?: Cv;
  letter?: Letter;
  template?: Template;
  photo_data_url?: string | null;
}

export interface GenerateInput {
  profile_text: string;
  job_text: string;
  template: Template;
  photo_data_url: string | null;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  role: "admin" | "user";
}

export interface BaseProfile {
  profile_text: string;
  cv: Cv;
  photo_data_url?: string | null;
  updated_at: string;
}

export interface AtsReport {
  score: number;
  verdict: "excellent" | "bon" | "moyen" | "faible";
  keywords_present?: string[];
  keywords_missing?: string[];
  sections_check?: Record<string, boolean>;
  format_warnings?: string[];
  recommendations?: string[];
  experience_match?: string;
  skill_gap_analysis?: string;
}

export type ProfileMode = "pdf" | "linkedin" | "manual";
export type JobMode = "url" | "paste" | "file";

export type NotifyLevel = "success" | "error" | "info";

export interface Notification {
  level: NotifyLevel;
  title: string;
  description?: string;
}
