export const runtime = 'nodejs';

import { sqlite } from '@/db';
import Card from '@/components/ui/Card';
import UiLink from '@/components/ui/Link';
import Badge from '@/components/ui/Badge';

type Document = {
  id: number;
  url: string;
  title: string;
  text_preview: string;
  published_at: number | null;
  fetched_at: number;
  source_name: string;
  cluster_id: number | null;
  cluster_title: string | null;
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function DocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Number(params.page || '1');
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const docs = sqlite.prepare(`
  SELECT
    d.id,
    d.url,
    d.title,
    d.text_preview,
    d.published_at,
    d.fetched_at,
    s.name AS source_name,
    (
      SELECT c.id
      FROM cluster_documents cd
      JOIN clusters c ON c.id = cd.cluster_id
      WHERE cd.document_id = d.id
      LIMIT 1
    ) AS cluster_id,
    (
      SELECT c.title
      FROM cluster_documents cd
      JOIN clusters c ON c.id = cd.cluster_id
      WHERE cd.document_id = d.id
      LIMIT 1
    ) AS cluster_title
  FROM documents d
  JOIN sources s ON s.id = d.source_id
  ORDER BY d.fetched_at DESC
  LIMIT ? OFFSET ?
`).all(limit, offset) as Document[];


  const totalRow = sqlite.prepare(`SELECT COUNT(*) AS cnt FROM documents`).get() as any;
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1>Документы</h1>
        <p className="text-zinc-400 mt-2">
          Всего документов: {total}
        </p>
      </div>

      {/* Пагинация сверху */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Страница {currentPage} из {totalPages}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <UiLink href={`/documents?page=${currentPage - 1}`}>
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
                  ← Назад
                </button>
              </UiLink>
            )}
            {currentPage < totalPages && (
              <UiLink href={`/documents?page=${currentPage + 1}`}>
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
                  Вперёд →
                </button>
              </UiLink>
            )}
          </div>
        </div>
      )}

      {/* Список документов */}
      <div className="space-y-4">
        {docs.map((doc) => (
          <Card key={doc.id}>
            <div className="space-y-3">
              {/* Заголовок */}
              <div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-400 hover:text-blue-300"
                >
                  📄 {doc.title}
                </a>
              </div>

              {/* Метаданные */}
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>{doc.source_name}</span>
                <span>•</span>
                <span>
                  {doc.published_at
                    ? new Date(doc.published_at).toLocaleDateString('ru-RU')
                    : new Date(doc.fetched_at).toLocaleDateString('ru-RU')}
                </span>
                <span>•</span>
                <span>
                  {new Date(doc.fetched_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Preview текста */}
              <p className="text-zinc-300 text-sm leading-relaxed">
                {doc.text_preview.slice(0, 300)}
                {doc.text_preview.length > 300 ? '...' : ''}
              </p>

              {/* Кластер */}
              {doc.cluster_id && doc.cluster_title && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">🏷️ Кластер:</span>
                  <UiLink href={`/clusters/${doc.cluster_id}`}>
                    <Badge variant="primary">{doc.cluster_title}</Badge>
                  </UiLink>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Пагинация снизу */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Страница {currentPage} из {totalPages}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <UiLink href={`/documents?page=${currentPage - 1}`}>
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
                  ← Назад
                </button>
              </UiLink>
            )}
            {currentPage < totalPages && (
              <UiLink href={`/documents?page=${currentPage + 1}`}>
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
                  Вперёд →
                </button>
              </UiLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
