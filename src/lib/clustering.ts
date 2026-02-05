import { sqlite } from '@/db';
import { buildTfIdfVectors, cosineSimilarity } from './tfidf';
import { tokenizeText } from './tokenize';
import { TfIdf } from 'natural';

export interface ClusterData {
  title: string;
  mentions_count: number;
  top_terms_json: string;
  avg_similarity: number;
  documents: Array<{ document_id: number; similarity: number }>;
}

export async function performClustering(
  runId: number,
  threshold: number,
  minClusterSize: number
): Promise<{ clusters: ClusterData[]; singles: number[] }> {
  // Кластеризуем только DRAFT документы текущего run
  const docs = sqlite
    .prepare(
      `
    SELECT id, title, text_preview FROM documents
    WHERE run_id = ? AND status = 'draft' AND LENGTH(TRIM(text_preview)) > 0
    ORDER BY LENGTH(title) + LENGTH(text_preview) DESC
  `
    )
    .all(runId) as Array<{ id: number; title: string; text_preview: string }>;

  const validDocs = docs.filter((doc) => {
    const tokens = tokenizeText(doc.title + ' ' + doc.text_preview);
    return tokens.length >= 5;
  });

  if (validDocs.length === 0) {
    return { clusters: [], singles: [] };
  }

  const vectors = buildTfIdfVectors(validDocs.map(d => ({
  title: d.title,
  preview: d.text_preview
})));
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
      if (sim >= threshold) {
        group.push({ docIdx: j, similarity: sim });
      }
    }

    if (group.length >= minClusterSize) {
      const coreDocIdx = validDocs[i].id;
      const topTerms = extractTopTerms(validDocs, group.map((g) => g.docIdx), 3);

      const avgSim =
        group.length > 1 ? group.slice(1).reduce((acc, g) => acc + g.similarity, 0) / (group.length - 1) : 1.0;

      clusters.push({
        title: topTerms.join(', '),
        mentions_count: group.length,
        top_terms_json: JSON.stringify(topTerms),
        avg_similarity: avgSim,
        documents: group.map((g) => ({
          document_id: validDocs[g.docIdx].id,
          similarity: g.similarity,
        })),
      });

      group.forEach((g) => clustered.add(g.docIdx));
    }
  }

  const singles = validDocs
    .map((_, idx) => idx)
    .filter((idx) => !clustered.has(idx))
    .map((idx) => validDocs[idx].id);

  return { clusters, singles };
}

function extractTopTerms(
  docs: Array<{ title: string; text_preview: string }>,
  docIndices: number[],
  topN: number
): string[] {
  const tfidf = new TfIdf();

  docIndices.forEach((idx) => {
    const doc = docs[idx];
    const text = `${doc.title} ${doc.text_preview}`;
    tfidf.addDocument(text);
  });

  const termScores = new Map<string, number>();

  for (let i = 0; i < docIndices.length; i++) {
    tfidf.listTerms(i).forEach(({ term, tfidf: score }) => {
      termScores.set(term, (termScores.get(term) || 0) + score);
    });
  }

  const sorted = Array.from(termScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);

  return sorted.length > 0 ? sorted : ['cluster'];
}
