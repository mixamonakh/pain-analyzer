import { tokenize } from './tokenize';

interface Document {
  id: number;
  title: string;
  text_preview: string;
}

export function generateClusterTitle(docs: Document[], topTerms: string[]): string {
  // Извлечь entities (заглавные слова, аббревиатуры)
  const entities: Set<string> = new Set();

  for (const doc of docs) {
    extractEntities(doc.title).forEach(e => entities.add(e));
  }

  // Если есть entity — используем её
  if (entities.size > 0) {
    const topEntity = Array.from(entities)[0];
    return `${topEntity}: ${topTerms.slice(0, 2).join(', ')}`;
  }

  // Паттерны болей
  const patterns = [
    { keywords: ['запуск', 'релиз', 'анонс', 'выпуск'], template: 'Запуск продукта' },
    { keywords: ['проблема', 'баг', 'ошибка', 'не работает'], template: 'Технические проблемы' },
    { keywords: ['стоимость', 'цена', 'дорого', 'платить'], template: 'Вопросы стоимости' },
    { keywords: ['интеграция', 'api', 'подключ'], template: 'Интеграции' },
    { keywords: ['безопасность', 'уязвимость', 'утечка'], template: 'Безопасность' },
    { keywords: ['производительность', 'медленно', 'тормоз'], template: 'Производительность' }
  ];

  for (const { keywords, template } of patterns) {
    if (topTerms.some(term => keywords.some(kw => term.includes(kw)))) {
      return `${template}: ${topTerms.slice(0, 2).join(', ')}`;
    }
  }

  // Дефолт — топ-3 термина
  return topTerms.slice(0, 3).join(', ');
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];

  // Заглавные слова (Google, Yandex, ChatGPT)
  const capitalizedWords = text.match(/\b[A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁ][a-zа-яё]+)*\b/g) || [];
  entities.push(...capitalizedWords);

  // Аббревиатуры (AI, API, ML)
  const abbrs = text.match(/\b[A-ZА-ЯЁ]{2,}\b/g) || [];
  entities.push(...abbrs);

  return [...new Set(entities)].slice(0, 3);
}
