import { sqlite, db } from '@/db';
import path from 'path';
import fs from 'fs';

const vacuumFile = path.join(process.cwd(), '.last-vacuum');

async function runMaintenance() {
  console.log('Running maintenance...');

  const retentionDays = 30;
  const thresholdMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const transaction = sqlite.transaction(() => {
    const oldDocs = sqlite
      .prepare('SELECT id FROM documents WHERE fetched_at < ?')
      .all(thresholdMs) as Array<any>;

    console.log(`Deleting ${oldDocs.length} old documents...`);

    oldDocs.forEach((doc) => {
      sqlite.prepare('DELETE FROM documents_fts WHERE rowid = ?').run(doc.id);
      sqlite.prepare('DELETE FROM cluster_documents WHERE document_id = ?').run(doc.id);
      sqlite.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
    });

    sqlite.prepare(
      'DELETE FROM clusters WHERE id NOT IN (SELECT DISTINCT cluster_id FROM cluster_documents)'
    );
  });

  transaction();

  const lastVacuum = fs.existsSync(vacuumFile)
    ? parseInt(fs.readFileSync(vacuumFile, 'utf-8'))
    : 0;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (Date.now() - lastVacuum > oneDayMs) {
    console.log('Running VACUUM...');
    sqlite.exec('VACUUM');
    fs.writeFileSync(vacuumFile, Date.now().toString());
  }

  console.log('Maintenance complete');
}

runMaintenance().catch(console.error);
