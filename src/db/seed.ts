import { sqlite, db } from './index';
import { config } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_CONFIG = {
  cluster_threshold: '0.35',
  min_cluster_size: '3',
  preview_length: '800',
  max_docs_per_run: '1000',
  fetch_timeout_ms: '15000',
  fetch_delay_ms: '800',
  retention_days: '30',
  proxy_enabled: 'false',
  proxy_urls_json: '[]',
};

async function seed() {
  console.log('Seeding config...');

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    const existing = await db.query.config.findFirst({
      where: eq(config.key, key),
    });

    if (!existing) {
      await db.insert(config).values({
        key,
        value,
        description: `Default value for ${key}`,
      });
      console.log(`✓ Seeded ${key}`);
    }
  }

  console.log('Creating FTS5 table...');
  try {
    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(title, text_preview);
    `);
    console.log('✓ FTS5 table created');
  } catch (err) {
    console.error('FTS5 error:', err);
  }

  console.log('Seed complete');
}

seed().catch(console.error);
