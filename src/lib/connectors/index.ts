// src/lib/connectors/index.ts
import type { ConnectorConfig, FetchResult, ConnectorType } from './types';
import { RssConnector } from './rssConnector';

export interface IConnector {
  readonly type: ConnectorType;

  /**
   * Основной метод коннектора: забрать данные из источника.
   * Ничего не пишет в БД, только возвращает сырые элементы.
   */
  fetch(config: ConnectorConfig): Promise<FetchResult>;
}

/**
 * Реестр коннекторов по plugin_type из таблицы sources.
 * Для новых коннекторов достаточно добавить сюда mapping.
 */
const connectorsRegistry: Record<ConnectorType, IConnector> = {
  rss: new RssConnector(),
  telegram: {
    type: 'telegram',
    async fetch(): Promise<FetchResult> {
      throw new Error('Telegram connector not implemented yet');
    },
  },
  html: {
    type: 'html',
    async fetch(): Promise<FetchResult> {
      throw new Error('HTML connector not implemented yet');
    },
  },
};

export function getConnector(type: ConnectorType): IConnector {
  const connector = connectorsRegistry[type];
  if (!connector) {
    throw new Error(`Connector not found for type: ${type}`);
  }
  return connector;
}
