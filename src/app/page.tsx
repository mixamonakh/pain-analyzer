export const runtime = 'nodejs';

import { db } from '@/db';
import StartRunButton from '@/components/StartRunButton';
import RunsTable from '@/components/RunsTable';

export default async function Dashboard() {
  const runs = await db.query.runs.findMany({
    orderBy: (r) => r.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-zinc-400">Управление запусками и мониторинг</p>
      </div>

      <StartRunButton />

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Все запуски</h2>
        <RunsTable runs={runs} />
      </div>
    </div>
  );
}
