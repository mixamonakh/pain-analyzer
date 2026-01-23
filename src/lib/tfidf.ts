import { TfIdf } from 'natural';
import { tokenizeText } from './tokenize';

export function buildTfIdfVectors(docs: { preview: string; title: string }[]): Map<number, Map<string, number>> {
  const tfidf = new TfIdf();

  docs.forEach((doc) => {
    const text = `${doc.title} ${doc.preview}`;
    tfidf.addDocument(text);
  });

  const vectors = new Map<number, Map<string, number>>();

  for (let docIdx = 0; docIdx < docs.length; docIdx++) {
    const terms = new Map<string, number>();
    const sortedTerms: Array<[string, number]> = [];

    tfidf.listTerms(docIdx).forEach(({ term, tfidf: score }) => {
      sortedTerms.push([term, score]);
    });

    sortedTerms.sort((a, b) => b[1] - a[1]);

    sortedTerms.slice(0, 200).forEach(([term, score]) => {
      terms.set(term, score);
    });

    vectors.set(docIdx, terms);
  }

  return vectors;
}

export function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);

  allTerms.forEach((term) => {
    const a = vecA.get(term) || 0;
    const b = vecB.get(term) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
