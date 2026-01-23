// File: src/lib/logger.ts
import pino from 'pino';
import { sqlite } from '@/db';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

let currentRunId: number | null = null;

export function setCurrentRunId(runId: number | null) {
  currentRunId = runId;
}

export const logger = pino({
  level: process.env.WORKER_LOG_LEVEL || 'info',
});

export function logEvent(
  level: 'info' | 'warn' | 'error',
  component: string,
  message: string,
  meta?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const runId = currentRunId;

  try {
    sqlite
      .prepare(
        `
      INSERT INTO logs (run_id, level, component, message, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(runId, level, component, message, meta ? JSON.stringify(meta) : null, Date.now());
  } catch (err) {
    logger.error({ err }, 'Failed to insert log');
  }

  if (currentRunId) {
    const jsonlPath = path.join(logsDir, `run-${currentRunId}.jsonl`);
    const logEntry = {
      ts: timestamp,
      runId,
      level,
      component,
      msg: message,
      meta,
    };
    try {
      fs.appendFileSync(jsonlPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      logger.error({ err }, 'Failed to write JSONL log');
    }
  }

  // Правильный вызов pino
  logger[level]({ component, runId, ...meta }, message);
}
