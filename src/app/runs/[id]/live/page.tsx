// src/app/runs/[id]/live/page.tsx

export const runtime = 'nodejs';

import { db } from '@/db';
import { runs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import RunLiveMonitor from '@/components/RunLiveMonitor';

export default async function RunLivePage({
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
    return <div className="text-red-500">Run не найден</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Запуск #{runId}</h1>
        <Link
          href={`/runs/${runId}`}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
        >
          ← К результатам
        </Link>
      </div>

      <RunLiveMonitor runId={runId} initialStatus={run.status as any} />
    </div>
  );
}
