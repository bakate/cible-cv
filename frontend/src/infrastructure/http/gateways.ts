/** HTTP adapters (axios) implementing the core gateways. Only place aware of URLs & axios. */
import axios, { AxiosError, type AxiosInstance } from "axios";

import type {
  AnalysisGateway,
  AuthGateway,
  ExportGateway,
  GenerationGateway,
  ParsingGateway,
  ProfileGateway,
} from "@/core/ports";
import { GatewayError } from "@/core/ports";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL as string;
export const API = `${BACKEND_URL}/api`;
const AUTH_PORTAL = "https://auth.emergentagent.com/";

export const createHttpClient = (): AxiosInstance => {
  const client = axios.create({ baseURL: API, timeout: 120000, withCredentials: true });
  client.interceptors.response.use(undefined, (err: AxiosError<{ detail?: string }>) => {
    const detail = err.response?.data?.detail;
    throw new GatewayError(typeof detail === "string" && detail ? detail : err.message || "Erreur réseau", err.response?.status);
  });
  return client;
};

export class HttpAuthGateway implements AuthGateway {
  constructor(private http: AxiosInstance) {}
  me = async () => (await this.http.get("/auth/me")).data;
  processSession = async (sessionId: string) =>
    (await this.http.post("/auth/process-session", null, { headers: { "X-Session-ID": sessionId } })).data;
  logout = async () => {
    await this.http.post("/auth/logout", null);
  };
  startLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `${AUTH_PORTAL}?redirect=${encodeURIComponent(redirectUrl)}`;
  };
}

export class HttpParsingGateway implements ParsingGateway {
  constructor(private http: AxiosInstance) {}
  parseFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return (await this.http.post("/parse/pdf", fd, { headers: { "Content-Type": "multipart/form-data" } })).data.text as string;
  };
  parseUrl = async (url: string) => (await this.http.post("/parse/url", { url })).data.text as string;
}

export class HttpGenerationGateway implements GenerationGateway {
  constructor(private http: AxiosInstance) {}
  generate = async (input: Parameters<GenerationGateway["generate"]>[0]) => (await this.http.post("/generate", input)).data;
  list = async () => (await this.http.get("/generations")).data;
  get = async (id: string) => (await this.http.get(`/generations/${id}`)).data;
  update = async (id: string, patch: Parameters<GenerationGateway["update"]>[1]) => (await this.http.put(`/generations/${id}`, patch)).data;
  remove = async (id: string) => {
    await this.http.delete(`/generations/${id}`);
  };
}

export class HttpProfileGateway implements ProfileGateway {
  constructor(private http: AxiosInstance) {}
  getBase = async () => {
    const { data } = await this.http.get("/profile/base");
    return data?.exists ? data : null;
  };
  saveBase = async (payload: Parameters<ProfileGateway["saveBase"]>[0]) => {
    await this.http.put("/profile/base", payload);
  };
  deleteBase = async () => {
    await this.http.delete("/profile/base");
  };
}

export class HttpAnalysisGateway implements AnalysisGateway {
  constructor(private http: AxiosInstance) {}
  regroupSkills = async (payload: { skills: string[]; tools: string[] }) =>
    (await this.http.post("/regroup-skills", payload)).data.skill_groups || [];
  atsCheck = async (generationId: string) => (await this.http.post("/ats-check", { generation_id: generationId })).data;
}

export class UrlExportGateway implements ExportGateway {
  cvPdfUrl = (id: string, layout: string) => `${API}/generations/${id}/export/cv.pdf?layout=${layout}`;
  letterPdfUrl = (id: string) => `${API}/generations/${id}/export/letter.pdf`;
  cvDocxUrl = (id: string) => `${API}/generations/${id}/export/cv.docx`;
  letterDocxUrl = (id: string) => `${API}/generations/${id}/export/letter.docx`;
}
