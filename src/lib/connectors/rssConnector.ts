// src/lib/connectors/rssConnector.ts
import type { IConnector } from './index';
import type { ConnectorConfig, FetchResult, RawItem } from './types';
import { fetchRSSFeedWithRetry } from '@/lib/rss';
import striptags from 'striptags';

/**
 * RSS-коннектор: оборачивает существующую rss.ts логику в модульный интерфейс.
 */
export class RssConnector implements IConnector {
  readonly type = 'rss' as const;

  async fetch(config: ConnectorConfig): Promise<FetchResult> {
    const errors: string[] = [];

    try {
      const items = await fetchRSSFeedWithRetry(
        config.url,
        config.fetchTimeoutMs,
        config.fetchDelayMs,
        config.proxyUrl
      );

      const sliced = items.slice(0, config.maxItems);

      const mapped: RawItem[] = sliced.map((item: any, index) => {
        const url = item.link || item.guid || '';
        const title = item.title || '(no title)';

        const contentRaw =
          item.content ||
          item.contentSnippet ||
          item.summary ||
          item.description ||
          '';

        const text = striptags(contentRaw)
          .trim()
          .replace(/\s+/g, ' ');

        const dateStr = item.isoDate || item.pubDate;
        let publishedAt: number | null = null;
        if (dateStr) {
          const d = new Date(dateStr);
          const ts = d.getTime();
          publishedAt = Number.isFinite(ts) ? ts : null;
        }

        return {
          externalId: item.guid || url || String(index),
          url,
          title,
          text,
          html: typeof contentRaw === 'string' ? contentRaw : undefined,
          author: item.creator || item.author || undefined,
          publishedAt,
          contentType: 'html',
          contentBody: contentRaw || '',
          mediaJson: undefined,
          meta: {
            raw: item,
          },
        };
      });

      return { items: mapped, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      return { items: [], errors };
    }
  }
}
