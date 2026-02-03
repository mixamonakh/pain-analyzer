-- drizzle/0002_migrate_sources_plugin_type.sql
-- Приводим старые значения plugin_type к типам коннекторов

UPDATE sources
SET plugin_type = 'rss'
WHERE plugin_type = 'generic'
   OR plugin_type LIKE 'preset_%';
