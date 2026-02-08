import { buildTfIdfVectors, cosineSimilarity } from '@/lib/tfidf';
import { tokenizeText } from '@/lib/tokenize';
import type { ClusterData } from './types';

export interface ClusteringDocument {
  id: number;
  title: string;
  text: string;
}

function buildTopTerms(
  vectors: Map<number, Map<string, number>>,
  docIndices: number[],
  maxTerms: number
): Array<{ term: string; weight: number }> {
  const termScores = new Map<string, number>();

  for (const idx of docIndices) {
    const vec = vectors.get(idx);
    if (!vec) continue;
    for (const [term, score] of vec.entries()) {
      termScores.set(term, (termScores.get(term) ?? 0) + score);
    }
  }

  return Array.from(termScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term, weight]) => ({ term, weight }));
}

export async function performClustering(
  docs: ClusteringDocument[],
  opts: { threshold: number; minClusterSize: number; maxTerms?: number }
): Promise<ClusterData[]> {
  const threshold = opts.threshold ?? 0.35;
  const minClusterSize = opts.minClusterSize ?? 2;
  const maxTerms = opts.maxTerms ?? 10;

  const validDocs = docs.filter((doc) => {
    const tokens = tokenizeText(`${doc.title} ${doc.text}`);
    return tokens.length >= 5;
  });

  if (validDocs.length === 0) return [];

  const vectors = buildTfIdfVectors(
    validDocs.map((d) => ({
      title: d.title,
      preview: d.text,
    }))
  );

  const clustered = new Set<number>();
  const clusters: ClusterData[] = [];

  for (let i = 0; i < validDocs.length; i++) {
    if (clustered.has(i)) continue;

    const group: { docIdx: number; similarity: number }[] = [{ docIdx: i, similarity: 1.0 }];
    const vecI = vectors.get(i);
    if (!vecI) continue;

    for (let j = i + 1; j < validDocs.length; j++) {
      if (clustered.has(j)) continue;
      const vecJ = vectors.get(j);
      if (!vecJ) continue;

      const sim = cosineSimilarity(vecI, vecJ);
      if (sim >= threshold) group.push({ docIdx: j, similarity: sim });
    }

    if (group.length >= minClusterSize) {
      const docIndices = group.map((g) => g.docIdx);
      const topTerms = buildTopTerms(vectors, docIndices, maxTerms);
      const title = topTerms.length > 0 ? topTerms.slice(0, 3).map((t) => t.term).join(', ') : 'cluster';

      const avgSimilarity =
        group.length > 1
          ? group.slice(1).reduce((acc, g) => acc + g.similarity, 0) / (group.length - 1)
          : 1.0;

      clusters.push({
        title,
        mentionsCount: group.length,
        topTerms,
        avgSimilarity,
        documents: group.map((g) => ({
          id: validDocs[g.docIdx].id,
          similarity: g.similarity,
        })),
      });

      group.forEach((g) => clustered.add(g.docIdx));
    }
  }

  return clusters;
}

