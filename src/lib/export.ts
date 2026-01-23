// File: src/lib/export.ts
import { sqlite } from '@/db';
import path from 'path';
import fs from 'fs';

export interface ExportStats {
  sources_processed: number;
  docs_fetched: number;
  docs_new: number;
  docs_updated: number;
  clusters_created: number;
  singles: number;
  duration_ms: number;
  warning: string | null;
}

export function exportRunData(runId: number) {
  const exportsDir = path.join(process.cwd(), 'exports', `run-${runId}`);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const documents = sqlite
    .prepare(
      `
    SELECT
      d.id, d.url, d.title, d.text_preview, d.published_at, d.fetched_at,
      s.name as source_name
    FROM documents d
    LEFT JOIN sources s ON d.source_id = s.id
    WHERE d.run_id = ?
    ORDER BY d.fetched_at DESC
  `
    )
    .all(runId) as Array<any>;

  const clusters = sqlite
    .prepare(
      `
    SELECT
      id, title, mentions_count, top_terms_json, avg_similarity
    FROM clusters
    WHERE run_id = ?
    ORDER BY mentions_count DESC
  `
    )
    .all(runId) as Array<any>;

  const run = sqlite.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as any;

  const stats: ExportStats = run.stats_json ? JSON.parse(run.stats_json) : {};

  const rawDocsJsonl = documents.map((d) => JSON.stringify(d)).join('\n');
  fs.writeFileSync(path.join(exportsDir, 'raw_documents.jsonl'), rawDocsJsonl);

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    stats,
    clusters: clusters.map((c) => ({
      ...c,
      top_terms: JSON.parse(c.top_terms_json),
    })),
    documents: documents,
  };

  fs.writeFileSync(path.join(exportsDir, 'report.json'), JSON.stringify(report, null, 2));

  const markdown = generateMarkdownReport(report);
  fs.writeFileSync(path.join(exportsDir, 'report.md'), markdown);
}

function generateMarkdownReport(report: any): string {
  const { runId, generatedAt, stats, clusters, documents } = report;

  let md = `# Pain Analyzer Report\n\n`;
  md += `**Generated:** ${generatedAt}\n\n`;

  md += `## Statistics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Run ID | ${runId} |\n`;
  md += `| Documents Fetched | ${stats.docs_fetched || 0} |\n`;
  md += `| Documents New | ${stats.docs_new || 0} |\n`;
  md += `| Clusters Created | ${stats.clusters_created || 0} |\n`;
  md += `| Duration | ${stats.duration_ms || 0}ms |\n`;
  if (stats.warning) {
    md += `| Warning | ${stats.warning} |\n`;
  }
  md += `\n`;

  if (clusters && clusters.length > 0) {
    md += `## Clusters\n\n`;
    clusters.forEach((cluster: any, idx: number) => {
      md += `### ${idx + 1}. ${cluster.title}\n\n`;
      md += `- **Mentions:** ${cluster.mentions_count}\n`;
      md += `- **Avg Similarity:** ${cluster.avg_similarity.toFixed(3)}\n`;
      md += `- **Top Terms:** ${cluster.top_terms.join(', ')}\n\n`;
    });
  }

  md += `## Documents (${documents.length})\n\n`;
  documents.slice(0, 50).forEach((doc: any, idx: number) => {
    md += `${idx + 1}. [${doc.title}](${doc.url})\n`;
    md += `   - Source: ${doc.source_name || 'unknown'}\n`;
    md += `   - Preview: ${doc.text_preview.slice(0, 100)}...\n\n`;
  });

  if (documents.length > 50) {
    md += `... and ${documents.length - 50} more documents.\n`;
  }

  return md;
}
