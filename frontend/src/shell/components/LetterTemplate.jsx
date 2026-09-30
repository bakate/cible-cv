export default function LetterTemplate({ letter, sender, recipientCompany }) {
  if (!letter) return null;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="cv-page padded font-sans" id="letter-render-area" data-testid="letter-render">
      <div className="grid grid-cols-2 gap-8 mb-8 text-[12.5px] text-zinc-700">
        <div>
          <p className="font-bold text-zinc-900">{sender?.full_name || ""}</p>
          {sender?.contact?.email && <p>{sender.contact.email}</p>}
          {sender?.contact?.phone && <p>{sender.contact.phone}</p>}
          {sender?.contact?.location && <p>{sender.contact.location}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold text-zinc-900">{recipientCompany || ""}</p>
          <p className="mt-4">{today}</p>
        </div>
      </div>

      {letter.subject && (
        <p className="mb-6 text-[13.5px]"><span className="font-bold">Objet :</span> {letter.subject}</p>
      )}

      {letter.recipient && (
        <p className="mb-4 text-[13.5px]">{letter.recipient}</p>
      )}

      <div className="text-[13.5px] leading-relaxed whitespace-pre-line text-zinc-800">
        {letter.body}
      </div>
    </div>
  );
}
