// File: src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3'; // <-- ВАЖНО: better-sqlite3
import path from 'path';
import * as schema from './schema';

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_URL || './pain-analyzer.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

export { sqlite, db };
export * from './schema';
