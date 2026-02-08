// src/components/RunLiveMonitor.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import LogEntry from './LogEntry';
import RunStatusBadge from './RunStatusBadge';

interface Log {
  id: number;
  ts: number;
  level: 'info' | 'warn' | 'error';
  component: string;
  message: string;
  meta: Record<string, any> | null;
}

interface RunLiveMonitorProps {
  runId: number;
  initialStatus: 'pending' | 'running' | 'done' | 'error';
}

export default function RunLiveMonitor({ runId, initialStatus }: RunLiveMonitorProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [lastId, setLastId] = useState(0); // Используем ID вместо timestamp
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Проверка статуса run
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  function normalizeLog(raw: any): Log {
    let meta: Record<string, any> | null = raw.meta ?? null;
    if (!meta && raw.meta_json) {
      try {
        meta = JSON.parse(raw.meta_json);
      } catch {
        meta = null;
      }
    }

    return {
      id: raw.id,
      ts: raw.ts ?? raw.created_at ?? raw.createdAt ?? Date.now(),
      level: raw.level,
      component: raw.component,
      message: raw.message,
      meta,
    };
  }

  // Загрузка новых логов
  const fetchLogs = async () => {
    try {
      const url = lastId > 0
        ? `/api/runs/${runId}/logs?afterId=${lastId}`
        : `/api/runs/${runId}/logs`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rawLogs = Array.isArray(data?.logs) ? data.logs : (Array.isArray(data) ? data : []);
        const normalized = rawLogs.map(normalizeLog).filter((log: Log) => Number.isFinite(log.id));
        if (normalized.length > 0) {
          // Дедупликация по ID
          setLogs((prev) => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = normalized.filter((l: Log) => !existingIds.has(l.id));
            return [...prev, ...newLogs];
          });

          const maxId = Math.max(...normalized.map((l: Log) => l.id));
          setLastId(maxId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Автоскролл вниз
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Детект ручного скролла
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Polling
  useEffect(() => {
    fetchStatus();
    fetchLogs();

    const isRunning = status === 'pending' || status === 'running';

    if (!isRunning) {
      // Если run завершён, делаем последний финальный запрос
      return;
    }

    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [runId, lastId, status]);

  const isRunning = status === 'pending' || status === 'running';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Live-мониторинг</h2>
        <RunStatusBadge status={status} />
        {!autoScroll && (
          <button
            onClick={() => setAutoScroll(true)}
            className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded text-sm hover:bg-blue-900/50"
          >
            ↓ К последним логам
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded p-8 text-center text-zinc-500">
          {isRunning ? 'Ожидание логов...' : 'Логов пока нет'}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-2 max-h-[600px] overflow-y-auto"
        >
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      <div className="text-sm text-zinc-500">
        {isRunning ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Обновление каждые 2 секунды
          </div>
        ) : (
          'Run завершён, обновления остановлены'
        )}
      </div>
    </div>
  );
}
