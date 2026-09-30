/** Composition root for the frontend: builds the concrete Services bundle. */
import type { Services } from "@/core/ports";

import { AnchorDownloader, DataUrlFileReader, NavigatorClipboard, WindowConfirmer } from "./browser/adapters";
import {
  HttpAnalysisGateway,
  HttpAuthGateway,
  HttpGenerationGateway,
  HttpParsingGateway,
  HttpProfileGateway,
  UrlExportGateway,
  createHttpClient,
} from "./http/gateways";

export const buildServices = (): Services => {
  const http = createHttpClient();
  return {
    auth: new HttpAuthGateway(http),
    parsing: new HttpParsingGateway(http),
    generations: new HttpGenerationGateway(http),
    profile: new HttpProfileGateway(http),
    analysis: new HttpAnalysisGateway(http),
    exports: new UrlExportGateway(),
    downloader: new AnchorDownloader(),
    clipboard: new NavigatorClipboard(),
    confirmer: new WindowConfirmer(),
    files: new DataUrlFileReader(),
  };
};
