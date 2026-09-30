/** Browser adapters for side-effect ports (download, clipboard, confirm, file reading). */
import type { ClipboardPort, Confirmer, Downloader, FileReaderPort } from "@/core/ports";

export class AnchorDownloader implements Downloader {
  open(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export class NavigatorClipboard implements ClipboardPort {
  write = (text: string) => navigator.clipboard.writeText(text);
}

export class WindowConfirmer implements Confirmer {
  confirm = async (message: string) => window.confirm(message);
}

export class DataUrlFileReader implements FileReaderPort {
  readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => resolve(String(e.target?.result || ""));
      r.onerror = () => reject(new Error("Lecture de l'image impossible"));
      r.readAsDataURL(file);
    });
}
