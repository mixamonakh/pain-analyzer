import { tokenize } from './tokenize';

interface Document {
  id: number;
  title: string;
  text_preview: string;
}

export function generateClusterTitle(docs: Document[]): string {
  const allTokens: string[] = [];
  const entities: Set<string> = new Set();

  for (const doc of docs) {
    const text = `${doc.title} ${doc.text_preview}`;
    const tokens = tokenize(text);
    allTokens.push(...tokens);

    extractEntities(doc.title).forEach(e => entities.add(e));
  }

  const termFreq = new Map<string, number>();
  for (const token of allTokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  const sortedTerms = Array.from(termFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);

  if (entities.size > 0) {
    const topEntity = Array.from(entities)[0];
    return `${topEntity}: ${sortedTerms.slice(0, 3).join(', ')}`;
  }

  const keywordPatterns = [
    { pattern: /запуск|релиз|анонс/i, template: 'Запуск продукта' },
    { pattern: /проблема|баг|ошибка/i, template: 'Технические проблемы' },
    { pattern: /стоимость|цена|дорого/i, template: 'Вопросы стоимости' },
    { pattern: /интеграция|api/i, template: 'Интеграции и API' },
    { pattern: /безопасность|уязвимость/i, template: 'Вопросы безопасности' }
  ];

  for (const { pattern, template } of keywordPatterns) {
    if (sortedTerms.some(term => pattern.test(term))) {
      return `${template}: ${sortedTerms.slice(0, 2).join(', ')}`;
    }
  }

  return sortedTerms.slice(0, 3).join(', ');
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];

  const capitalizedWords = text.match(/\b[A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁ][a-zа-яё]+)*\b/g) || [];
  entities.push(...capitalizedWords);

  const abbrs = text.match(/\b[A-ZА-ЯЁ]{2,}\b/g) || [];
  entities.push(...abbrs);

  return [...new Set(entities)].slice(0, 3);
}
