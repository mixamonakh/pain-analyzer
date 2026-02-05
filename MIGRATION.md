# Migration: Draft/Published Documents Refactor

## Что изменилось

### Модель documents
- Добавлено поле `status` (`'draft'` | `'published'`)
- Убран `unique()` с `normalized_url`
- Добавлен уникальный индекс: один `published` документ на URL
- Индекс `(run_id, status)` для быстрой выборки draft

### Worker
- Всегда создаёт `status='draft'` документы
- Дедупликация только внутри `run_id` + `status='draft'`
- НЕ добавляет draft в FTS

### Clustering
- Кластеризует только `status='draft'` документы run

### FTS
- Индексирует только `status='published'`
- Триггеры автоматически обновляют индекс

## Шаги миграции

### 1. Бекап (опционально)
```bash
cp pain-analyzer.db pain-analyzer.db.backup
```

### 2. Пересоздание БД (РЕКОМЕНДУЕТСЯ)
Так как старые данные не нужны:

```bash
# Удаляем старую БД
rm pain-analyzer.db
rm pain-analyzer.db-shm pain-analyzer.db-wal

# Создаём новую схему
pnpm db:push

# Применяем FTS миграцию
sqlite3 pain-analyzer.db < drizzle/fts-published-only.sql

# Заполняем начальные данные
pnpm db:seed
```

### 3. Перезапуск сервисов
```bash
# В одном терминале
pnpm worker

# В другом
pnpm dev
```

## Проверка

```bash
# Проверяем схему
sqlite3 pain-analyzer.db "PRAGMA table_info(documents);"
# Должно быть поле 'status'

# Проверяем индексы
sqlite3 pain-analyzer.db "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='documents';"
# Должны быть: documents_published_url_idx, documents_run_status_idx

# Проверяем FTS триггеры
sqlite3 pain-analyzer.db "SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='documents';"
# Должны быть: documents_fts_insert, documents_fts_update, documents_fts_delete, documents_fts_unpublish
```

## Что дальше

После этой миграции можно переходить к **этапу 3: Processing API**:
- `/api/processing/processors` - метаданные процессоров
- `/api/runs/[id]/preview` - preview пайплайна
- `/api/runs/[id]/versions` - CRUD версий обработки
- `/api/pipelines` - сохранение шаблонов
