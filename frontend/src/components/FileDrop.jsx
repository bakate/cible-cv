import { useCallback, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

export default function FileDrop({ onFile, accept = ".pdf,.docx,.txt", testId, label }) {
  const [active, setActive] = useState(false);
  const [name, setName] = useState("");

  const handleFile = useCallback((file) => {
    if (!file) return;
    setName(file.name);
    onFile(file);
  }, [onFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <label
      data-testid={testId}
      onDragOver={(e) => { e.preventDefault(); setActive(true); }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      className={`dropzone ${active ? "active" : ""} flex flex-col items-center justify-center gap-3 p-8 cursor-pointer text-center`}
    >
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        data-testid={`${testId}-input`}
      />
      {name ? (
        <>
          <FileText className="w-10 h-10" strokeWidth={2.5} />
          <div className="font-bold flex items-center gap-2">
            {name}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setName(""); onFile(null); }}
              className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center"
              data-testid={`${testId}-clear`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-zinc-500">Cliquez pour remplacer</span>
        </>
      ) : (
        <>
          <UploadCloud className="w-10 h-10" strokeWidth={2.5} />
          <div className="font-bold">{label || "Glissez votre fichier ici"}</div>
          <span className="text-xs text-zinc-500">PDF, DOCX ou TXT — max 10 Mo</span>
        </>
      )}
    </label>
  );
}
