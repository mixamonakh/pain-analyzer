'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface Source {
  id: number;
  name: string;
  feed_url: string;
  plugin_type: string;
  enabled: number;
}

interface SourcesListProps {
  initialSources: Source[];
}

export default function SourcesList({ initialSources }: SourcesListProps) {
  const [sources, setSources] = useState<Source[]>(initialSources);

  const handleToggle = async (id: number, enabled: number) => {
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled === 0 ? 1 : 0 }),
      });
      if (res.ok) {
        setSources(sources.map((s) => (s.id === id ? { ...s, enabled: enabled === 0 ? 1 : 0 } : s)));
      }
    } catch (err) {
      console.error('Error toggling source:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSources(sources.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting source:', err);
    }
  };

  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <div className="text-zinc-400">Нет источников</div>
      ) : (
        sources.map((source) => (
          <div key={source.id} className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold">{source.name}</div>
                <div className="text-sm text-zinc-400 break-all mt-1">{source.feed_url}</div>
                <div className="mt-2">
                  <Badge variant="primary">{source.plugin_type}</Badge>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggle(source.id, source.enabled)}
                >
                  {source.enabled ? '✓ Включён' : '○ Отключён'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(source.id)}
                  className="text-red-400 border-red-600 hover:border-red-500"
                >
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
