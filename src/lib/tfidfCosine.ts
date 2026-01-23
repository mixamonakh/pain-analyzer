import natural from 'natural';
import { tokenize } from './tokenize';

export type Vec = Map<string, number>;

export function buildTopTfidfVectors(docs: Array<{ id: number; title: string; text_preview: string }>): Map<number, Vec> {
  const tfidf = new natural.TfIdf();

  for (const d of docs) {
    const tokens = tokenize(`${d.title} ${d.text_preview}`);
    tfidf.addDocument(tokens.join(' '));
  }

  const out = new Map<number, Vec>();
  for (let i = 0; i < docs.length; i++) {
    const vec: Vec = new Map();
    const terms = tfidf.listTerms(i).map((x) => [x.term, x.tfidf] as const);
    terms.sort((a, b) => b[1] - a[1]);
    for (const [term, score] of terms.slice(0, 200)) vec.set(term, score);
    out.set(docs[i].id, vec);
  }
  return out;
}

export function cosineSimilarity(a: Vec, b: Vec): number {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;

  for (const [k, va] of a.entries()) {
    const vb = b.get(k);
    if (vb != null) dot += va * vb;
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

export function topTermsForCluster(docs: Array<{ id: number; title: string; text_preview: string }>, docIds: number[], topN: number): string[] {
  const tfidf = new natural.TfIdf();
  const selected = docs.filter((d) => docIds.includes(d.id));

  for (const d of selected) {
    const tokens = tokenize(`${d.title} ${d.text_preview}`);
    tfidf.addDocument(tokens.join(' '));
  }

  const score = new Map<string, number>();
  for (let i = 0; i < selected.length; i++) {
    for (const t of tfidf.listTerms(i)) score.set(t.term, (score.get(t.term) ?? 0) + t.tfidf);
  }

  return Array.from(score.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([term]) => term);
}
