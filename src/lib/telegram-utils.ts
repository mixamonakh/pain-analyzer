// src/lib/telegram-utils.ts

/**
 * Утилиты для работы с Telegram URL и именами.
 * Переиспользуются в коннекторе и bulk API.
 */

export function extractTelegramChannelName(url: string): string | null {
  // @username формат
  if (url.startsWith('@')) {
    return url.substring(1);
  }

  // https://t.me/name или https://t.me/s/name
  const match = url.match(/t\.me\/(?:s\/)?([^/?]+)/);
  if (match) {
    return match[1];
  }

  return null;
}

export function isTelegramUrl(url: string): boolean {
  return url.startsWith('@') || url.includes('t.me/') || url.includes('telegram.me/');
}

export function normalizeTelegramUrl(url: string): string | null {
  const channelName = extractTelegramChannelName(url);
  if (!channelName) return null;
  return `https://t.me/s/${channelName}`;
}
