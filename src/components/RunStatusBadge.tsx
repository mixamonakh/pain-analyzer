// src/components/RunStatusBadge.tsx

'use client';

interface RunStatusBadgeProps {
  status: 'pending' | 'running' | 'done' | 'error';
}

const statusConfig = {
  pending: {
    label: 'Ожидает',
    color: 'bg-zinc-700 text-zinc-300',
    icon: '⏸',
  },
  running: {
    label: 'Выполняется',
    color: 'bg-blue-900/30 text-blue-400 animate-pulse',
    icon: '▶',
  },
  done: {
    label: 'Завершён',
    color: 'bg-green-900/30 text-green-400',
    icon: '✓',
  },
  error: {
    label: 'Ошибка',
    color: 'bg-red-900/30 text-red-400',
    icon: '✗',
  },
};

export default function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
