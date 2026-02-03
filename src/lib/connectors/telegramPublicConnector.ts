// src/lib/connectors/telegramPublicConnector.ts
import type { IConnector } from './index';
import type { ConnectorConfig, FetchResult, RawItem } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { sleep } from '@/lib/sleep';
import { logger } from '@/lib/logger';
import { extractTelegramChannelName } from '@/lib/telegram-utils';
import {
  TELEGRAM_SELECTORS,
  DEFAULT_TIME_WINDOW_HOURS,
  MAX_TITLE_LENGTH,
} from './constants';

export class TelegramPublicConnector implements IConnector {
  readonly type = 'telegram' as const;

  async fetch(config: ConnectorConfig): Promise<FetchResult> {
    const errors: string[] = [];
    const items: RawItem[] = [];

    try {
      const channelName = extractTelegramChannelName(config.url);
      if (!channelName) {
        errors.push(`Invalid Telegram URL format: ${config.url}`);
        return { items: [], errors };
      }

      const webUrl = `https://t.me/s/${channelName}`;

      logger.info({ channelName, webUrl }, 'Fetching Telegram channel');

      if (config.fetchDelayMs > 0) {
        await sleep(config.fetchDelayMs);
      }

      const response = await axios.get(webUrl, {
        timeout: config.fetchTimeoutMs,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
        // TODO: Добавить поддержку прокси когда понадобится
        // ...(config.proxyUrl && { httpsAgent: createProxyAgent(config.proxyUrl) }),
      });

      logger.info({ status: response.status }, 'Telegram response received');

      const html = response.data;
      const $ = cheerio.load(html);

      const messages = $(TELEGRAM_SELECTORS.MESSAGE);
      logger.info({ count: messages.length }, 'Found messages on page');

      if (messages.length === 0) {
        const pageTitle = $('title').text();
        logger.warn({ pageTitle }, 'No messages found');

        if (pageTitle.includes('not found') || pageTitle.includes('Private channel')) {
          errors.push(`Channel not found or private: ${channelName}`);
        } else {
          errors.push(`No messages found on page, channel might be empty or structure changed`);
        }
        return { items: [], errors };
      }

      const now = Date.now();
      const timeWindowMs = DEFAULT_TIME_WINDOW_HOURS * 60 * 60 * 1000;
      const cutoffTime = now - timeWindowMs;

      let collected = 0;
      let skippedOld = 0;
      let skippedNoText = 0;

      messages.each((index, element) => {
        if (collected >= config.maxItems) return;

        try {
          const $msg = $(element);

          const dataPost = $msg.attr(TELEGRAM_SELECTORS.DATA_POST_ATTR);
          if (!dataPost) return;

          const messageId = dataPost.split('/')[1];
          if (!messageId) return;

          // Извлекаем дату
          const $time = $msg.find(TELEGRAM_SELECTORS.DATE);
          const datetime = $time.attr(TELEGRAM_SELECTORS.DATETIME_ATTR);
          let publishedAt: number | null = null;

          if (datetime) {
            const date = new Date(datetime);
            publishedAt = date.getTime();

            // Фильтр по времени
            if (publishedAt < cutoffTime) {
              skippedOld++;
              return;
            }
          }

          // Извлекаем текст
          const $text = $msg.find(TELEGRAM_SELECTORS.TEXT);
          const textContent = $text.text().trim();

          if (!textContent) {
            skippedNoText++;
            return;
          }

          const contentBody = $.html($msg);
          const messageUrl = `https://t.me/${channelName}/${messageId}`;

          const titleLine = textContent.split('\n')[0].substring(0, MAX_TITLE_LENGTH);
          const title = titleLine || `<telegram>: ${channelName}`;

          const rawItem: RawItem = {
            externalId: `telegram:${channelName}:${messageId}`,
            url: messageUrl,
            title,
            text: textContent,
            html: $text.html() || undefined,
            author: channelName,
            publishedAt,
            contentType: 'html',
            contentBody: contentBody || '',
            mediaJson: undefined,
            meta: {
              platform: 'telegram',
              name: channelName,
              messageId,
              sourceUrl: webUrl,
            },
          };

          items.push(rawItem);
          collected++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse message: ${msg}`);
        }

        return;
      });

      logger.info(
        { collected, skippedOld, skippedNoText },
        'Telegram fetch completed'
      );

      return { items, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, 'Telegram fetch error');
      errors.push(`Telegram fetch error: ${msg}`);
      return { items: [], errors };
    }
  }
}
