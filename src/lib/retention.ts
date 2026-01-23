import fs from 'fs';
import path from 'path';
import { sqlite } from '@/db';

export function retentionCleanup(retentionDays: number, minClusterSize: number) {
  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  sqlite.transaction(() => {
    const old = sqlite.prepare(`SELECT id FROM documents WHERE fetched_at < ?`).all(threshold) as Array<{ id: number }>;

    for (const d of old) {
      sqlite.prepare(`DELETE FROM documents_fts WHERE rowid = ?`).run(d.id);
      sqlite.prepare(`DELETE FROM cluster_documents WHERE document_id = ?`).run(d.id);
      sqlite.prepare(`DELETE FROM documents WHERE id = ?`).run(d.id);
    }

    // удалить кластеры, ставшие пустыми или "некорректными" (< minClusterSize)
    const cids = sqlite.prepare(`
      SELECT c.id AS id, COUNT(cd.document_id) AS cnt
      FROM clusters c
      LEFT JOIN cluster_documents cd ON cd.cluster_id = c.id
      GROUP BY c.id
    `).all() as Array<{ id: number; cnt: number }>;

    for (const c of cids) {
      if (!c.cnt || c.cnt < minClusterSize) {
        sqlite.prepare(`DELETE FROM cluster_documents WHERE cluster_id = ?`).run(c.id);
        sqlite.prepare(`DELETE FROM clusters WHERE id = ?`).run(c.id);
      }
    }
  })();

  maybeVacuumOncePerDay();
}

function maybeVacuumOncePerDay() {
  const f = path.join(process.cwd(), '.last-vacuum');
  const last = fs.existsSync(f) ? Number(fs.readFileSync(f, 'utf-8')) : 0;
  const day = 24 * 60 * 60 * 1000;
  if (!Number.isFinite(last) || Date.now() - last > day) {
    sqlite.exec('VACUUM;');
    fs.writeFileSync(f, String(Date.now()), 'utf-8');
  }
}
