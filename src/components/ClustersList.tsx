'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface Cluster {
  id: number;
  title: string;
  mentions_count: number;
  avg_similarity: number;
}

export default function ClustersList({
  runId,
  searchQuery = ''
}: {
  runId: number;
  searchQuery?: string;
}) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clusters?runId=${runId}`)
      .then(res => res.json())
      .then(data => {
        const clustersArray = Array.isArray(data) ? data : [];
        setClusters(clustersArray);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch clusters:', err);
        setClusters([]);
        setLoading(false);
      });
  }, [runId]);

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) {
      return clusters;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return clusters.filter(c =>
      c.title.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, clusters]);

  if (loading) {
    return <div className="text-zinc-400">Загрузка кластеров...</div>;
  }

  if (filteredClusters.length === 0) {
    return (
      <div className="text-zinc-400">
        {searchQuery ? 'Кластеры не найдены' : 'Нет кластеров'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchQuery && (
        <div className="text-sm text-zinc-500">
          Найдено кластеров: {filteredClusters.length}
        </div>
      )}

      {filteredClusters.map(cluster => (
        <Link
          key={cluster.id}
          href={`/clusters/${cluster.id}`}
          className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-blue-400">
              {cluster.title}
            </h3>
            <div className="text-sm text-zinc-500">
              {cluster.mentions_count} документов
            </div>
          </div>
          <div className="text-sm text-zinc-500 mt-2">
            Средняя схожесть: {(cluster.avg_similarity * 100).toFixed(1)}%
          </div>
        </Link>
      ))}
    </div>
  );
}
