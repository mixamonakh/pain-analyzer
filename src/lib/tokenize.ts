import { removeStopwords, rus, eng } from 'stopword';

export function tokenizeText(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const cleaned = removeStopwords(normalized, [...rus, ...eng]);
  return cleaned;
}

// Экспортируем alias для tfidfCosine.ts
export { tokenizeText as tokenize };
