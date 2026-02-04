// src/app/runs/[id]/page.tsx

export const runtime = 'nodejs';

import { sqlite, db } from '@/db';
import { runs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import ExportButton from '@/components/ExportButton';
import ClustersListWithSearch from '@/components/ClustersListWithSearch';

export default async function RunDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runId = parseInt(id);

  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
  });

  if (!run) {
    return <div className="text-red-500">Run not found</div>;
  }

  const stats = run.stats_json ? JSON.parse(run.stats_json) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Запуск #{runId}</h1>
        <div className="flex items-center gap-4 mt-4">
          <div className="px-3 py-1 rounded bg-zinc-800 text-sm">
            <span className="font-semibold">Статус:</span> {run.status}
          </div>
          {run.error_message && (
            <div className="px-3 py-1 rounded bg-red-900/30 text-red-400 text-sm">
              Ошибка: {run.error_message}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
            <div className="text-zinc-400 text-sm">Документов загружено</div>
            <div className="text-2xl font-bold">{stats.docs_fetched}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
            <div className="text-zinc-400 text-sm">Новых</div>
            <div className="text-2xl font-bold">{stats.docs_new}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
            <div className="text-zinc-400 text-sm">Кластеров создано</div>
            <div className="text-2xl font-bold">{stats.clusters_created}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
            <div className="text-zinc-400 text-sm">Время обработки</div>
            <div className="text-2xl font-bold">{(stats.duration_ms / 1000).toFixed(1)}s</div>
          </div>
        </div>
      )}

      {stats?.warning && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded p-4 text-yellow-300 text-sm">
          ⚠ {stats.warning === 'insufficient_data' ? 'Недостаточно данных для кластеризации' : stats.warning}
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href={`/runs/${runId}/live`}
          className="px-4 py-2 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded text-sm font-semibold"
        >
          📡 Live-мониторинг
        </Link>
        <ExportButton runId={runId} />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Кластеры</h2>
        <ClustersListWithSearch runId={runId} />
      </div>
    </div>
  );
}
