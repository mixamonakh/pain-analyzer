// src/lib/processing/processors/extract_text.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';
import * as cheerio from 'cheerio';

type ExtractTextConfig = {
  stripTags?: boolean; // default true
  minLength?: number; // default 10
};

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function extractFromHtml(html: string, stripTags: boolean): string {
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();

  const bodyText = $('body').text();
  const raw = stripTags ? bodyText : $.root().text();
  return normalizeText(raw);
}

function extractFromJson(rawJson: string): string {
  const tryParse = (): any => {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  };

  const data = tryParse();
  if (!data) return '';

  const candidates = new Set(['text', 'content', 'description']);

  const stack: any[] = [data];
  while (stack.length) {
    const cur = stack.pop();

    if (!cur) continue;

    if (typeof cur === 'string') {
      const t = normalizeText(cur);
      if (t) return t;
      continue;
    }

    if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i]);
      continue;
    }

    if (typeof cur === 'object') {
      for (const key of Object.keys(cur)) {
        const val = (cur as any)[key];
        if (candidates.has(key) && typeof val === 'string') {
          const t = normalizeText(val);
          if (t) return t;
        }
      }
      for (const key of Object.keys(cur)) {
        stack.push((cur as any)[key]);
      }
    }
  }

  return '';
}

export const extractTextProcessor: Processor = {
  id: 'extract_text',
  type: 'transform',
  name: 'Экстракция текста (raw → text)',
  description: 'Заполняет item.text из rawContent для html/text/json (stage 0).',

  schema: {
    stripTags: {
      type: 'boolean',
      label: 'Чистить HTML (script/style + текст из body)',
      default: true,
    },
    minLength: {
      type: 'number',
      label: 'Минимальная длина текста',
      default: 10,
      min: 0,
      max: 500,
      step: 1,
    },
  },

  async process(items: ProcessingItem[], config: ExtractTextConfig): Promise<ProcessorResult> {
    const stripTags = config.stripTags !== false;
    const minLength = typeof config.minLength === 'number' ? config.minLength : 10;

    let extractedCount = 0;
    let skippedAlreadyHasText = 0;
    let tooShortCount = 0;
    let errorsCount = 0;

    const transformed = items.map((item) => {
      if (item.text) {
        skippedAlreadyHasText++;
        return item;
      }

      try {
        let text = '';

        if (item.contentType === 'html') {
          text = extractFromHtml(item.rawContent, stripTags);
        } else if (item.contentType === 'text') {
          text = normalizeText(item.rawContent);
        } else if (item.contentType === 'json') {
          text = extractFromJson(item.rawContent);
        }

        if (!text || text.length < minLength) {
          tooShortCount++;
          return item;
        }

        extractedCount++;
        return { ...item, text };
      } catch {
        errorsCount++;
        return item;
      }
    });

    return {
      items: transformed,
      metadata: {
        extractedCount,
        skippedAlreadyHasText,
        tooShortCount,
        errorsCount,
        total: items.length,
        minLength,
        stripTags,
      },
    };
  },
};

