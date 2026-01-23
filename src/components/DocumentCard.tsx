interface Document {
  id: number;
  url: string;
  title: string;
  text_preview: string;
  fetched_at: number;
}

interface DocumentCardProps {
  doc: Document;
}

export default function DocumentCard({ doc }: DocumentCardProps) {
  return (
    <a href={doc.url} target="_blank" rel="noopener noreferrer">
      <div className="bg-zinc-900 border border-zinc-800 rounded p-4 hover:border-zinc-700 transition">
        <div className="font-semibold text-blue-400 hover:text-blue-300 break-words">{doc.title}</div>
        <p className="text-zinc-400 text-sm mt-2 line-clamp-3">{doc.text_preview}</p>
        <div className="text-xs text-zinc-500 mt-3">{new Date(doc.fetched_at).toLocaleString('ru-RU')}</div>
      </div>
    </a>
  );
}
