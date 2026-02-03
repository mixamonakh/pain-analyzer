// src/lib/connectors/telegramPublicConnector.ts
import type { IConnector } from './index';
import type { ConnectorConfig, FetchResult, RawItem } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { sleep } from '@/lib/sleep';

export class TelegramPublicConnector implements IConnector {
  readonly type = 'telegram' as const;

  async fetch(config: ConnectorConfig): Promise<FetchResult> {
    const errors: string[] = [];
    const items: RawItem[] = [];

    try {
      const channelName = this.extractChannelName(config.url);
      if (!channelName) {
        errors.push(`Invalid Telegram URL format: ${config.url}`);
        return { items: [], errors };
      }

      const webUrl = `https://t.me/s/${channelName}`;
      console.log(`[TG] Fetching from: ${webUrl}`);

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
        ...(config.proxyUrl && {
          proxy: false,
          httpsAgent: this.createProxyAgent(config.proxyUrl),
        }),
      });

      console.log(`[TG] Response status: ${response.status}`);

      const html = response.data;
      const $ = cheerio.load(html);

      const messages = $('.tgme_widget_message');
      console.log(`[TG] Found ${messages.length} messages on page`);

      // Проверяем есть ли вообще контент
      if (messages.length === 0) {
        // Возможно канал приватный или не существует
        const pageTitle = $('title').text();
        console.log(`[TG] Page title: ${pageTitle}`);

        if (pageTitle.includes('not found') || pageTitle.includes('Private channel')) {
          errors.push(`Channel not found or private: ${channelName}`);
        } else {
          errors.push(`No messages found on page, channel might be empty or structure changed`);
        }
        return { items: [], errors };
      }

      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      let collected = 0;
      let skippedOld = 0;
      let skippedNoText = 0;

      messages.each((index, element) => {
        if (collected >= config.maxItems) return;

        try {
          const $msg = $(element);

          const dataPost = $msg.attr('data-post');
          if (!dataPost) return;

          const messageId = dataPost.split('/')[1];
          if (!messageId) return;

          // Извлекаем дату
          const $time = $msg.find('.tgme_widget_message_date time');
          const datetime = $time.attr('datetime');
          let publishedAt: number | null = null;

          if (datetime) {
            const date = new Date(datetime);
            publishedAt = date.getTime();

            // Фильтр: только за последние 24 часа
            if (publishedAt < dayAgo) {
              skippedOld++;
              return;
            }
          }

          // Извлекаем текст сообщения
          const $text = $msg.find('.tgme_widget_message_text');
          const textContent = $text.text().trim();

          // Пропускаем сообщения без текста
          if (!textContent) {
            skippedNoText++;
            return;
          }

          const contentBody = $.html($msg);
          const messageUrl = `https://t.me/${channelName}/${messageId}`;

          const titleLine = textContent.split('\n')[0].substring(0, 100);
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

      console.log(`[TG] Collected: ${collected}, Skipped (old): ${skippedOld}, Skipped (no text): ${skippedNoText}`);

      return { items, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[TG] Fetch error:`, err);
      errors.push(`Telegram fetch error: ${msg}`);
      return { items: [], errors };
    }
  }

  private extractChannelName(url: string): string | null {
    if (url.startsWith('@')) {
      return url.substring(1);
    }

    const match = url.match(/t\.me\/(?:s\/)?([^/?]+)/);
    if (match) {
      return match[1];
    }

    return null;
  }

  private createProxyAgent(proxyUrl: string): any {
    return undefined;
  }
}
