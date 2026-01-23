'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Cluster {
  id: number;
  title: string;
  mentions_count: number;
  avg_similarity: number;
}

interface ClustersListProps {
  runId: number;
}

export default function ClustersList({ runId }: ClustersListProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await fetch(`/api/clusters?runId=${runId}`);
        const data = await res.json();
        setClusters(data.clusters || []);
      } catch (err) {
        console.error('Error fetching clusters:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, [runId]); // Зависимость только runId, не функция

  if (loading) {
    return <div>Загрузка кластеров...</div>;
  }

  if (clusters.length === 0) {
    return <div className="text-zinc-400">Кластеры не найдены. Попробуйте снизить порог кластеризации в настройках.</div>;
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => (
        <Link key={cluster.id} href={`/clusters/${cluster.id}`}>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4 hover:border-zinc-700 transition">
            <h3 className="font-semibold text-lg">{cluster.title}</h3>
            <div className="text-sm text-zinc-400 mt-2">
              {cluster.mentions_count} документов · сходство {cluster.avg_similarity.toFixed(2)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
