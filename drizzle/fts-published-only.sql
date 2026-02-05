-- FTS для documents: индексируем только published
-- Удаляем старый FTS если есть
DROP TABLE IF EXISTS documents_fts;

-- Создаём новый FTS индекс
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  text_preview,
  content='documents',
  content_rowid='id'
);

-- Триггеры для автоматического обновления FTS только для published
CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents WHEN NEW.status = 'published' BEGIN
  INSERT INTO documents_fts(rowid, title, text_preview)
  VALUES (NEW.id, NEW.title, NEW.text_preview);
END;

CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents WHEN NEW.status = 'published' BEGIN
  DELETE FROM documents_fts WHERE rowid = OLD.id;
  INSERT INTO documents_fts(rowid, title, text_preview)
  VALUES (NEW.id, NEW.title, NEW.text_preview);
END;

CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = OLD.id;
END;

-- Триггер для удаления из FTS когда документ становится draft
CREATE TRIGGER documents_fts_unpublish AFTER UPDATE ON documents WHEN OLD.status = 'published' AND NEW.status = 'draft' BEGIN
  DELETE FROM documents_fts WHERE rowid = OLD.id;
END;
