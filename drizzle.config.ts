// File: drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/tables.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './pain-analyzer.db'
  },
});
