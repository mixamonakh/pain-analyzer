export const runtime = 'nodejs';

import { sqlite } from '@/db';
import Link from 'next/link';

export default async function ClusterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clusterId = parseInt(id);

  const cluster = sqlite
    .prepare('SELECT * FROM clusters WHERE id = ?')
    .get(clusterId) as any;

  if (!cluster) {
    return <div className="text-red-500">Cluster not found</div>;
  }

  const documents = sqlite
    .prepare(
      `
    SELECT d.*, cd.similarity
    FROM documents d
    JOIN cluster_documents cd ON d.id = cd.document_id
    WHERE cd.cluster_id = ?
    ORDER BY cd.similarity DESC
  `
    )
    .all(clusterId) as any[];

  const topTerms = JSON.parse(cluster.top_terms_json);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{cluster.title}</h1>
        <div className="flex gap-4 mt-4 text-sm text-zinc-400">
          <span>📊 Упоминаний: {cluster.mentions_count}</span>
          <span>🔗 Сходство: {cluster.avg_similarity.toFixed(3)}</span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Ключевые термины</h3>
        <div className="flex flex-wrap gap-2">
          {topTerms.map((term: string) => (
            <span key={term} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded text-sm">
              {term}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Документы в кластере ({documents.length})</h3>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-zinc-900 p-4 rounded border border-zinc-800 hover:border-zinc-700 transition">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold break-words">
                    {doc.title}
                  </a>
                  <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{doc.text_preview}</p>
                  <div className="text-xs text-zinc-500 mt-2">
                    {new Date(doc.fetched_at).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div className="text-sm font-semibold text-green-400 flex-shrink-0">
                  {(doc.similarity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href={`/runs/${cluster.run_id}`} className="text-blue-400 hover:text-blue-300">
        ← Вернуться к запуску
      </Link>
    </div>
  );
}
