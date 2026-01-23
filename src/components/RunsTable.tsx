// File: src/components/RunsTable.tsx
import Link from 'next/link';
import Badge from './ui/Badge';

interface Run {
  id: number;
  status: string;
  started_at: number | null;
  finished_at: number | null;
  error_message: string | null;
}

interface RunsTableProps {
  runs: Run[];
}

export default function RunsTable({ runs }: RunsTableProps) {
  return (
    <div className="space-y-3">
      {runs.length === 0 ? (
        <div className="text-zinc-400">Нет запусков</div>
      ) : (
        runs.map((run) => (
          <Link key={run.id} href={`/runs/${run.id}`}>
            <div className="bg-zinc-900 border border-zinc-800 rounded p-4 hover:border-zinc-700 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="font-semibold">Run #{run.id}</div>
                  <Badge variant={run.status === 'done' ? 'success' : run.status === 'error' ? 'error' : 'warning'}>
                    {run.status}
                  </Badge>
                </div>
                <div className="text-sm text-zinc-400">
                  {run.finished_at ? new Date(run.finished_at).toLocaleString('ru-RU') : 'In progress'}
                </div>
              </div>
              {run.error_message && <div className="text-red-400 text-sm mt-2">{run.error_message}</div>}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
