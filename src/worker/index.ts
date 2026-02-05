// src/worker/index.ts
import { sqlite, db } from '@/db';
import { runs, sources, documents, clusters, cluster_documents, raw_items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeUrl } from '@/lib/normalizeUrl';
import { md5Hash } from '@/lib/hashing';
import striptags from 'striptags';
import { performClustering } from '@/lib/clustering';
import { exportRunData, type ExportStats } from '@/lib/export';
import { logEvent, setCurrentRunId, logger } from '@/lib/logger';
import { getConnector } from '@/lib/connectors';
import type { ConnectorConfig, RawItem } from '@/lib/connectors/types';

interface Config {
  cluster_threshold: number;
  min_cluster_size: number;
  preview_length: number;
  max_docs_per_run: number;
  fetch_timeout_ms: number;
  fetch_delay_ms: number;
  retention_days: number;
  proxy_enabled: boolean;
  proxy_urls_json: string[];
}

let activeRunId: number | null = null;

async function loadConfig(): Promise<Config> {
  const rows = (await db.query.config.findMany()) as any[];
  const parsed: Record<string, any> = {};

  rows.forEach((row) => {
    const key = row.key;
    let value: any = row.value;

    if (key.includes('threshold') || key.includes('similarity')) {
      value = parseFloat(value);
    } else if (key.includes('_json')) {
      value = JSON.parse(value);
    } else if (key.includes('enabled') || key === 'proxy_enabled') {
      value = value === 'true' || value === '1';
    } else {
      value = parseInt(value) || value;
    }

    parsed[key] = value;
  });

  return {
    cluster_threshold: parsed.cluster_threshold || 0.35,
    min_cluster_size: parsed.min_cluster_size || 3,
    preview_length: parsed.preview_length || 800,
    max_docs_per_run: parsed.max_docs_per_run || 1000,
    fetch_timeout_ms: parsed.fetch_timeout_ms || 15000,
    fetch_delay_ms: parsed.fetch_delay_ms || 800,
    retention_days: parsed.retention_days || 30,
    proxy_enabled: parsed.proxy_enabled || false,
    proxy_urls_json: parsed.proxy_urls_json || [],
  };
}

function claimPendingRun(): number | null {
  try {
    const result = sqlite
      .prepare(
        `
      WITH selected AS (
        SELECT id FROM runs
        WHERE status = 'pending'
        ORDER BY id LIMIT 1
      )
      UPDATE runs
      SET status = 'running', started_at = ?
      WHERE id IN (SELECT id FROM selected)
        AND status = 'pending'
      RETURNING id;
    `
      )
      .get(Date.now()) as any;

    if (result && result.id) {
      return result.id;
    }
  } catch (err) {
    logger.warn('RETURNING not supported, using fallback');
  }

  const transaction = sqlite.transaction(() => {
    const pending = sqlite
      .prepare("SELECT id FROM runs WHERE status = 'pending' ORDER BY id LIMIT 1")
      .get() as any;

    if (!pending) {
      return null;
    }

    sqlite
      .prepare('UPDATE runs SET status = ?, started_at = ? WHERE id = ? AND status = ?')
      .run('running', Date.now(), pending.id, 'pending');

    return pending.id;
  });

  return transaction();
}

function markStuckRunsAsError(): void {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  sqlite
    .prepare(
      `
    UPDATE runs
    SET status = 'error', error_message = 'stuck running', finished_at = ?
    WHERE status = 'running' AND started_at < ?
  `
    )
    .run(Date.now(), twoHoursAgo);
}

function getProxyUrl(proxyUrls: string[]): string | undefined {
  if (proxyUrls.length === 0) return undefined;
  return proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
}

/**
 * ФАЗА 1: Сбор сырых данных через коннекторы
 * Сохраняет raw_items для всех источников
 * Создаёт DRAFT документы (status='draft', run_id=текущий)
 * Дедупликация только внутри текущего run
 */
async function fetchRawContent(
  runId: number,
  config: Config
): Promise<{ totalFetched: number; totalErrors: number }> {
  const enabledSources = (await db.query.sources.findMany({
    where: eq(sources.enabled, 1),
  })) as any[];

  let totalFetched = 0;
  let totalErrors = 0;

  for (const source of enabledSources) {
    try {
      logEvent('info', 'fetch', `Fetching from ${source.name}`, { sourceId: source.id });

      const connector = getConnector(source.plugin_type);

      const connectorConfig: ConnectorConfig = {
        sourceId: source.id,
        sourceName: source.name,
        url: source.feed_url,
        pluginType: source.plugin_type,
        fetchTimeoutMs: config.fetch_timeout_ms,
        fetchDelayMs: config.fetch_delay_ms,
        maxItems: config.max_docs_per_run,
        proxyUrl: config.proxy_enabled ? getProxyUrl(config.proxy_urls_json) : undefined,
      };

      const result = await connector.fetch(connectorConfig);

      if (result.errors.length > 0) {
        result.errors.forEach((err) => {
          logEvent('warn', 'fetch', `Fetch warning: ${err}`, { sourceId: source.id });
        });
        totalErrors += result.errors.length;
      }

      logEvent('info', 'fetch', `Fetched ${result.items.length} raw items from ${source.name}`, {
        sourceId: source.id,
        count: result.items.length,
      });

      // Создаём документы и raw в одной транзакции
      const transaction = sqlite.transaction(() => {
        result.items.forEach((rawItem) => {
          if (!rawItem.url) {
            logEvent('warn', 'parse', 'Item without URL, skipping', {
              sourceId: source.id,
              title: rawItem.title,
            });
            return;
          }

          const normalizedUrl = normalizeUrl(rawItem.url);
          if (!normalizedUrl) {
            logEvent('warn', 'parse', 'Failed to normalize URL', {
              sourceId: source.id,
              url: rawItem.url,
            });
            return;
          }

          // Дедупликация ТОЛЬКО внутри текущего run (draft документы)
          const existing = sqlite
            .prepare('SELECT id FROM documents WHERE run_id = ? AND normalized_url = ? AND status = "draft"')
            .get(runId, normalizedUrl) as any;

          let documentId: number;

          if (existing) {
            // Обновляем существующий draft документ этого run
            const preview = rawItem.text.slice(0, config.preview_length);
            const normalizedTitle = rawItem.title.toLowerCase().trim();
            const normalizedPreview = preview.toLowerCase().trim();
            const contentHash = md5Hash(normalizedTitle + '\n' + normalizedPreview);

            sqlite
              .prepare(
                `
              UPDATE documents
              SET title = ?, text_preview = ?, published_at = ?, fetched_at = ?, content_hash = ?
              WHERE id = ?
            `
              )
              .run(
                rawItem.title,
                preview,
                rawItem.publishedAt,
                Date.now(),
                contentHash,
                existing.id
              );

            // Обновляем FTS
            sqlite.prepare('DELETE FROM documents_fts WHERE rowid = ?').run(existing.id);
            sqlite
              .prepare('INSERT INTO documents_fts(rowid, title, text_preview) VALUES (?, ?, ?)')
              .run(existing.id, rawItem.title, preview);

            documentId = existing.id;
          } else {
            // Создаём новый DRAFT документ
            const preview = rawItem.text.slice(0, config.preview_length);
            const normalizedTitle = rawItem.title.toLowerCase().trim();
            const normalizedPreview = preview.toLowerCase().trim();
            const contentHash = md5Hash(normalizedTitle + '\n' + normalizedPreview);

            const result = sqlite
              .prepare(
                `
              INSERT INTO documents (source_id, run_id, url, normalized_url, title, text_preview, published_at, fetched_at, content_hash, excluded, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft')
            `
              )
              .run(
                source.id,
                runId,
                rawItem.url,
                normalizedUrl,
                rawItem.title,
                preview,
                rawItem.publishedAt,
                Date.now(),
                contentHash
              ) as any;

            documentId = result.lastInsertRowid;

            // НЕ добавляем draft в FTS (FTS только для published)
          }

          // Сохраняем raw_items (всегда создаём новую запись для истории)
          sqlite
            .prepare(
              `
            INSERT INTO raw_items (document_id, content_type, content_body, media_json, fetched_at)
            VALUES (?, ?, ?, ?, ?)
          `
            )
            .run(
              documentId,
              rawItem.contentType,
              rawItem.contentBody,
              rawItem.mediaJson ? JSON.stringify(rawItem.mediaJson) : null,
              Date.now()
            );
        });
      });

      transaction();
      totalFetched += result.items.length;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logEvent('error', 'fetch', `Failed to fetch ${source.name}`, {
        sourceId: source.id,
        error: errorMsg,
      });
      totalErrors++;
    }
  }

  return { totalFetched, totalErrors };
}

async function performAndSaveClustering(
  runId: number,
  config: Config
): Promise<{ clustersCreated: number; singles: number }> {
  logEvent('info', 'cluster', 'Starting clustering', { runId });

  const { clusters: clusterData, singles } = await performClustering(
    runId,
    config.cluster_threshold,
    config.min_cluster_size
  );

  const transaction = sqlite.transaction(() => {
    clusterData.forEach((cluster) => {
      const result = sqlite
        .prepare(
          `
        INSERT INTO clusters (run_id, title, mentions_count, top_terms_json, avg_similarity)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(runId, cluster.title, cluster.mentions_count, cluster.top_terms_json, cluster.avg_similarity) as any;

      const clusterId = result.lastInsertRowid;

      cluster.documents.forEach((doc) => {
        sqlite
          .prepare(
            `
          INSERT INTO cluster_documents (cluster_id, document_id, similarity)
          VALUES (?, ?, ?)
        `
          )
          .run(clusterId, doc.document_id, doc.similarity);
      });
    });
  });

  transaction();

  logEvent('info', 'cluster', `Clustering complete`, {
    runId,
    clustersCreated: clusterData.length,
    singles: singles.length,
  });

  return { clustersCreated: clusterData.length, singles: singles.length };
}

async function cleanupOldData(config: Config): Promise<void> {
  const thresholdMs = Date.now() - config.retention_days * 24 * 60 * 60 * 1000;

  const transaction = sqlite.transaction(() => {
    const oldDocs = sqlite
      .prepare('SELECT id FROM documents WHERE fetched_at < ? AND status = "draft"')
      .all(thresholdMs) as Array<any>;

    oldDocs.forEach((doc) => {
      sqlite.prepare('DELETE FROM raw_items WHERE document_id = ?').run(doc.id);
      sqlite.prepare('DELETE FROM cluster_documents WHERE document_id = ?').run(doc.id);
      sqlite.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
    });

    sqlite.prepare('DELETE FROM clusters WHERE run_id NOT IN (SELECT id FROM runs WHERE finished_at > ?)').run(thresholdMs);
  });

  transaction();

  logEvent('info', 'db', `Cleaned up old draft data (${thresholdMs})`, {});
}

async function runWorker(): Promise<void> {
  process.on('SIGINT', () => {
    logger.info('SIGINT received');
    if (activeRunId) {
      sqlite
        .prepare(
          `
        UPDATE runs
        SET status = 'error', error_message = 'Worker terminated', finished_at = ?
        WHERE id = ?
      `
        )
        .run(Date.now(), activeRunId);
      logEvent('error', 'worker', 'Worker terminated', { runId: activeRunId });
    }
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (activeRunId) {
      sqlite
        .prepare(
          `
        UPDATE runs
        SET status = 'error', error_message = 'Worker terminated', finished_at = ?
        WHERE id = ?
      `
        )
        .run(Date.now(), activeRunId);
      logEvent('error', 'worker', 'Worker terminated', { runId: activeRunId });
    }
    process.exit(1);
  });

  while (true) {
    try {
      markStuckRunsAsError();

      const runId = claimPendingRun();
      if (!runId) {
        logger.debug('No pending runs, sleeping 5s');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      activeRunId = runId;
      setCurrentRunId(runId);

      logger.info(`Processing run ${runId}`);
      logEvent('info', 'worker', 'Starting run', { runId });

      const config = await loadConfig();
      const startTime = Date.now();

      // ФАЗА 1+2: Fetch raw content и создание DRAFT documents
      const { totalFetched, totalErrors } = await fetchRawContent(runId, config);

      if (totalFetched === 0) {
        sqlite
          .prepare(
            `
          UPDATE runs
          SET status = 'error', error_message = 'No documents fetched from any source', finished_at = ?
          WHERE id = ?
        `
          )
          .run(Date.now(), runId);
        logEvent('error', 'worker', 'No documents fetched', { runId });
        activeRunId = null;
        continue;
      }

      // Подсчёт draft документов для статистики
      const docsStats = sqlite
        .prepare('SELECT COUNT(*) as total FROM documents WHERE run_id = ? AND status = "draft"')
        .get(runId) as any;

      const { clustersCreated, singles } = await performAndSaveClustering(runId, config);

      const duration = Date.now() - startTime;
      const processedSources = await db.query.sources.findMany({
        where: eq(sources.enabled, 1),
      });

      const stats: ExportStats = {
        sources_processed: processedSources.length,
        docs_fetched: totalFetched,
        docs_new: docsStats.total || 0,
        docs_updated: 0,
        clusters_created: clustersCreated,
        singles: singles,
        duration_ms: duration,
        warning: clustersCreated === 0 && totalFetched > 0 ? 'insufficient_data' : null,
      };

      exportRunData(runId);

      sqlite
        .prepare(
          `
        UPDATE runs
        SET status = 'done', finished_at = ?, stats_json = ?
        WHERE id = ?
      `
        )
        .run(Date.now(), JSON.stringify(stats), runId);

      logEvent('info', 'worker', 'Run completed', { runId, stats });

      await cleanupOldData(config);

      activeRunId = null;
      setCurrentRunId(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, 'Worker error');
      if (activeRunId) {
        sqlite
          .prepare(
            `
          UPDATE runs
          SET status = 'error', error_message = ?, finished_at = ?
          WHERE id = ?
        `
          )
          .run(errorMsg, Date.now(), activeRunId);
        logEvent('error', 'worker', 'Run failed', { runId: activeRunId, error: errorMsg });
        activeRunId = null;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

runWorker().catch((err) => {
  logger.error({ err }, 'Fatal worker error');
  process.exit(1);
});
