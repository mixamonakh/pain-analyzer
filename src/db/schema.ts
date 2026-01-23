// File: src/db/schema.ts
import { relations } from 'drizzle-orm';
import { sources, runs, documents, clusters, cluster_documents, logs, config } from './tables';

export { sources, runs, documents, clusters, cluster_documents, logs, config };

export const sourcesRelations = relations(sources, ({ many }) => ({
  documents: many(documents),
}));

export const runsRelations = relations(runs, ({ many }) => ({
  documents: many(documents),
  clusters: many(clusters),
  logs: many(logs),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  source: one(sources, { fields: [documents.source_id], references: [sources.id] }),
  run: one(runs, { fields: [documents.run_id], references: [runs.id] }),
  clusters: many(cluster_documents),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  run: one(runs, { fields: [clusters.run_id], references: [runs.id] }),
  documents: many(cluster_documents),
}));

export const cluster_documentsRelations = relations(cluster_documents, ({ one }) => ({
  cluster: one(clusters, { fields: [cluster_documents.cluster_id], references: [clusters.id] }),
  document: one(documents, { fields: [cluster_documents.document_id], references: [documents.id] }),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  run: one(runs, { fields: [logs.run_id], references: [runs.id] }),
}));
