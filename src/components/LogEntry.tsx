// src/components/LogEntry.tsx

'use client';

interface LogEntryProps {
  log: {
    id: number;
    ts: number;
    level: 'info' | 'warn' | 'error';
    component: string;
    message: string;
    meta: Record<string, any> | null;
  };
}

const levelColors = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const levelBgColors = {
  info: 'bg-blue-900/20',
  warn: 'bg-yellow-900/20',
  error: 'bg-red-900/20',
};

export default function LogEntry({ log }: LogEntryProps) {
  const time = new Date(log.ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={`px-3 py-2 rounded text-sm ${levelBgColors[log.level]}`}>
      <div className="flex items-start gap-3">
        <span className="text-zinc-500 font-mono text-xs">{time}</span>
        <span className={`font-semibold text-xs uppercase ${levelColors[log.level]}`}>
          {log.level}
        </span>
        <span className="text-zinc-400 text-xs">[{log.component}]</span>
        <span className="flex-1 text-zinc-200">{log.message}</span>
      </div>
      {log.meta && Object.keys(log.meta).length > 0 && (
        <div className="mt-1 ml-[180px] text-xs text-zinc-500 font-mono">
          {JSON.stringify(log.meta)}
        </div>
      )}
    </div>
  );
}
