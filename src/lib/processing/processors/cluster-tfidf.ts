// src/lib/processing/processors/cluster-tfidf.ts
import type { Processor, ProcessingItem, ProcessorResult, ClusterData } from '../types';
import { performClustering } from '@/lib/clustering';

export const clusterTfidfProcessor: Processor = {
  id: 'cluster_tfidf',
  type: 'cluster',
  name: 'Кластеризация TF-IDF',
  description: 'Группирует похожие документы на основе TF-IDF и косинусного расстояния.',

  schema: {
    threshold: {
      type: 'number',
      label: 'Порог схожести (0-1)',
      default: 0.35,
      min: 0.1,
      max: 0.9,
      step: 0.05,
    },
    minClusterSize: {
      type: 'number',
      label: 'Минимальный размер кластера',
      default: 2,
      min: 2,
      max: 10,
      step: 1,
    },
  },

  async process(
    items: ProcessingItem[],
    config: { threshold: number; minClusterSize: number }
  ): Promise<ProcessorResult> {
    const threshold = config.threshold || 0.35;
    const minClusterSize = config.minClusterSize || 2;

    // Преобразуем ProcessingItem в формат для кластеризации
    const docsForClustering = items.map(item => ({
      id: item.id,
      title: item.title,
      text: item.text,
    }));

    // Выполняем кластеризацию
    const clusters = await performClustering(docsForClustering, {
      threshold,
      minClusterSize,
    });

    // Преобразуем результат в ClusterData
    const clusterData: ClusterData[] = clusters.map(cluster => ({
      title: cluster.title,
      mentionsCount: cluster.documents.length,
      topTerms: cluster.topTerms,
      avgSimilarity: cluster.avgSimilarity,
      documents: cluster.documents.map(doc => ({
        id: doc.id,
        similarity: doc.similarity,
      })),
    }));

    return {
      items, // Кластеризация не изменяет документы
      clusters: clusterData,
      metadata: {
        clustersCreated: clusterData.length,
        threshold,
        minClusterSize,
        totalDocuments: items.length,
        clusteredDocuments: clusterData.reduce((sum, c) => sum + c.documents.length, 0),
      },
    };
  },
};