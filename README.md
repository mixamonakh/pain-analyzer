```text
RSS-агрегатор с автоматической кластеризацией контента на основе TF-IDF и cosine similarity. Система собирает новости из множества источников, группирует их по темам и экспортирует отчёты.

## Архитектура

### Компоненты системы

```

┌─────────────────────────────────────────────────┐
│              RSS Sources (10 active)             │
│  Habr | VC.ru | TechCrunch | The Verge | ...    │
└───────────────┬─────────────────────────────────┘
↓
┌───────────────────────────────────────────────┐
│              Worker Process                    │
│  - Fetch RSS feeds                             │
│  - Parse items                                 │
│  - Normalize URLs                              │
│  - Deduplicate                                 │
└───────────────┬───────────────────────────────┘
↓
┌───────────────────────────────────────────────┐
│           SQLite Database                      │
│  - documents (384)                             │
│  - sources (10 active)                         │
│  - clusters (29)                               │
│  - runs (6)                                    │
│  - config                                      │
└───────────────┬───────────────────────────────┘
↓
┌───────────────────────────────────────────────┐
│         Clustering Pipeline                    │
│  Tokenize → TF-IDF → Cosine Sim → Group       │
└───────────────┬───────────────────────────────┘
↓
┌───────────────────────────────────────────────┐
│              Next.js Frontend                  │
│  - Dashboard (runs list)                       │
│  - Sources management                          │
│  - Clusters view                               │
│  - Export (JSON/JSONL/MD/ZIP)                  │
└───────────────────────────────────────────────┘

```

## Технологический стек

### Backend
- **Runtime:** Node.js 24+
- **Database:** SQLite 3 + Drizzle ORM
- **RSS Parsing:** rss-parser
- **NLP:** natural (tokenization), stopword (RU+EN)
- **Logging:** pino + pino-pretty
- **HTTP:** axios (retry + proxy support)

### Frontend
- **Framework:** Next.js 15.1.4 (App Router)
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **State:** React Server Components + API Routes

### DevOps
- **Package Manager:** npm
- **TypeScript:** 5.7.3
- **Build:** Next.js production build
- **Process Management:** npm scripts (worker, dev)

## Структура проекта

```

pain-analyzer/
├── src/
│   ├── app/                    \# Next.js App Router
│   │   ├── api/                \# API Routes
│   │   │   ├── clusters/       \# GET /api/clusters, /api/clusters/:id
│   │   │   ├── export/         \# GET /api/export/:runId (ZIP download)
│   │   │   ├── logs/           \# GET /api/logs?runId=X
│   │   │   ├── runs/           \# GET/POST /api/runs, /api/runs/start
│   │   │   ├── search/         \# GET /api/search?q=...
│   │   │   └── sources/        \# CRUD /api/sources
│   │   ├── clusters/[id]/      \# Cluster detail page
│   │   ├── runs/[id]/          \# Run detail page
│   │   ├── search/             \# Search page
│   │   ├── sources/            \# Sources management page
│   │   ├── layout.tsx          \# Root layout
│   │   └── page.tsx            \# Dashboard (home)
│   │
│   ├── components/
│   │   ├── ui/                 \# shadcn/ui components
│   │   ├── AddPresetsButton.tsx
│   │   ├── AddSourceButton.tsx
│   │   ├── ClustersList.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── ExportButton.tsx
│   │   ├── Modal.tsx
│   │   ├── RunsTable.tsx
│   │   ├── SearchInput.tsx
│   │   ├── SourcesList.tsx
│   │   └── StartRunButton.tsx
│   │
│   ├── db/
│   │   ├── index.ts            \# Drizzle client
│   │   ├── schema.ts           \# DB schema export
│   │   ├── seed.ts             \# Initial data seeding
│   │   └── tables.ts           \# Table definitions
│   │
│   ├── lib/
│   │   ├── clustering.ts       \# Main clustering logic
│   │   ├── export.ts           \# Export to JSON/JSONL/MD/ZIP
│   │   ├── hashing.ts          \# MD5 URL hashing
│   │   ├── logger.ts           \# Pino logger setup
│   │   ├── normalizeUrl.ts     \# URL normalization
│   │   ├── retention.ts        \# Data cleanup
│   │   ├── rss.ts              \# RSS fetching with retry
│   │   ├── tfidf.ts            \# TF-IDF implementation
│   │   ├── tokenize.ts         \# Text tokenization
│   │   └── types.ts            \# Shared TypeScript types
│   │
│   ├── scripts/
│   │   └── maintenance.ts      \# Manual DB maintenance
│   │
│   └── worker/
│       └── index.ts            \# Worker process (fetch + cluster + export)
│
├── pain-analyzer.db            \# SQLite database file
├── logs/                       \# JSONL log files (per run)
├── exports/                    \# Generated exports (ZIP archives)
├── drizzle.config.ts           \# Drizzle ORM config
├── next.config.ts              \# Next.js config
├── tailwind.config.ts          \# Tailwind config
├── tsconfig.json               \# TypeScript config
├── package.json                \# Dependencies
└── README.md                   \# This file

```

## База данных (SQLite Schema)

### Таблица: `sources`
RSS-источники для сбора контента.

```sql
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,               -- "TechCrunch"
  feed_url TEXT NOT NULL UNIQUE,    -- "https://techcrunch.com/feed/"
  plugin_type TEXT NOT NULL,        -- "generic" | "preset_habr" | ...
  enabled INTEGER DEFAULT 1,        -- 0 = disabled, 1 = enabled
  created_at INTEGER NOT NULL       -- Unix timestamp (ms)
);
```


### Таблица: `documents`

Спарсенные документы из RSS.

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,           -- FK → sources.id
  url TEXT NOT NULL,                    -- Original URL
  normalized_url TEXT NOT NULL UNIQUE,  -- Normalized URL (dedup)
  url_hash TEXT NOT NULL,               -- MD5(normalized_url)
  title TEXT NOT NULL,                  -- "Google hires Hume AI team"
  text_preview TEXT NOT NULL,           -- First 800 chars
  published_at INTEGER,                 -- Unix timestamp (ms)
  fetched_at INTEGER NOT NULL,          -- Unix timestamp (ms)
  source_name TEXT NOT NULL,            -- Denormalized for perf
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE INDEX idx_documents_source_id ON documents(source_id);
CREATE INDEX idx_documents_published_at ON documents(published_at);
CREATE INDEX idx_documents_normalized_url ON documents(normalized_url);
```


### Таблица: `runs`

История запусков worker.

```sql
CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,                 -- "pending" | "running" | "done" | "error"
  started_at INTEGER,                   -- Unix timestamp (ms)
  completed_at INTEGER,                 -- Unix timestamp (ms)
  stats TEXT,                           -- JSON: {"docs_fetched": 384, ...}
  error_message TEXT
);
```


### Таблица: `clusters`

Найденные кластеры документов.

```sql
CREATE TABLE clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,              -- FK → runs.id
  title TEXT NOT NULL,                  -- "ai, cost, efficiency"
  doc_count INTEGER NOT NULL,           -- 5
  avg_similarity REAL NOT NULL,         -- 0.45
  created_at INTEGER NOT NULL,          -- Unix timestamp (ms)
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
```


### Таблица: `cluster_documents`

Связь кластеров и документов (many-to-many).

```sql
CREATE TABLE cluster_documents (
  cluster_id INTEGER NOT NULL,          -- FK → clusters.id
  document_id INTEGER NOT NULL,         -- FK → documents.id
  similarity REAL NOT NULL,             -- 0.67
  PRIMARY KEY (cluster_id, document_id),
  FOREIGN KEY (cluster_id) REFERENCES clusters(id),
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```


### Таблица: `config`

Конфигурация системы.

```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,                 -- "cluster_threshold"
  value TEXT NOT NULL,                  -- "0.22"
  description TEXT                      -- "Cosine similarity threshold"
);
```

**Ключи конфигурации:**

- `cluster_threshold` = `"0.22"` — минимальная схожесть для группировки (0..1)
- `min_cluster_size` = `"2"` — минимум документов в кластере
- `preview_length` = `"800"` — длина text_preview в символах
- `fetch_timeout_ms` = `"15000"` — таймаут HTTP-запросов
- `retention_days` = `"30"` — срок хранения старых данных


### Таблица: `logs`

Логи worker (дублирование в SQLite + JSONL файлы).

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER,                       -- NULL для системных логов
  timestamp INTEGER NOT NULL,           -- Unix timestamp (ms)
  level TEXT NOT NULL,                  -- "info" | "warn" | "error"
  component TEXT NOT NULL,              -- "worker" | "fetch" | "cluster"
  message TEXT NOT NULL,
  meta TEXT                             -- JSON с доп. данными
);
```


## Алгоритм кластеризации

### Шаг 1: Токенизация

```typescript
// src/lib/tokenize.ts
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u0400-\u04FF\w\s]/g, '') // Только кириллица, латиница, цифры
    .split(/\s+/)
    .filter(token => token.length >= 2)   // Минимум 2 символа
    .filter(token => !isStopword(token)); // Удаляем "и", "the", "в"
}
```

**Пример:**

- Input: `"Google hires Hume AI team for voice startup"`
- Output: `["google", "hires", "hume", "ai", "team", "voice", "startup"]`


### Шаг 2: TF-IDF векторизация

```typescript
// src/lib/tfidf.ts
function computeTFIDF(documents: Document[]) {
  // TF (term frequency): как часто слово встречается в документе
  const tf = computeTermFrequency(doc);

  // IDF (inverse document frequency): насколько уникально слово
  const idf = Math.log(totalDocs / docsContainingTerm);

  // TF-IDF = TF × IDF
  return tf * idf;
}
```

**Результат:** каждый документ → вектор из 200 самых важных слов с весами.

### Шаг 3: Cosine Similarity

```typescript
function cosineSimilarity(vecA: Vector, vecB: Vector): number {
  const dot = sum(vecA[term] * vecB[term]);
  const normA = sqrt(sum(vecA[term]^2));
  const normB = sqrt(sum(vecB[term]^2));
  return dot / (normA * normB); // 0 = разные, 1 = идентичные
}
```


### Шаг 4: Жадная группировка

```typescript
// src/lib/clustering.ts
function greedyCluster(docs: Document[], threshold: number, minSize: number) {
  // 1. Сортируем документы по длине (DESC)
  docs.sort((a, b) => b.title.length - a.title.length);

  for (const coreDoc of docs) {
    const group = [coreDoc];

    // 2. Находим похожие документы
    for (const candidate of remainingDocs) {
      if (cosineSimilarity(coreDoc, candidate) >= threshold) {
        group.push(candidate);
      }
    }

    // 3. Если группа >= minSize → создаём кластер
    if (group.length >= minSize) {
      clusters.push({
        title: extractTopTerms(group, 3).join(', '),
        docs: group
      });
    }
  }
}
```


## API Endpoints

### Sources (Источники)

#### `GET /api/sources`

Получить список всех источников.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Habr",
    "feed_url": "https://habr.com/ru/rss/best/daily/",
    "plugin_type": "preset_habr",
    "enabled": 1,
    "created_at": 1769113931292
  }
]
```


#### `POST /api/sources`

Создать новый источник.

**Request:**

```json
{
  "name": "Новый источник",
  "feed_url": "https://example.com/rss",
  "plugin_type": "generic"
}
```

**Response:**

```json
{
  "success": true,
  "id": 16
}
```


#### `DELETE /api/sources/:id`

Удалить источник.

**Response:**

```json
{"success": true}
```


### Runs (Запуски)

#### `GET /api/runs`

Получить список всех запусков.

**Response:**

```json
[
  {
    "id": 6,
    "status": "done",
    "started_at": 1769115594906,
    "completed_at": 1769115608106,
    "stats": {
      "docs_fetched": 384,
      "docs_new": 312,
      "docs_updated": 72,
      "clusters_created": 29,
      "duration_ms": 13200
    }
  }
]
```


#### `POST /api/runs/start`

Запустить новый сбор.

**Response:**

```json
{"runId": 7}
```


#### `GET /api/runs/:id`

Детали конкретного запуска.

**Response:** аналогично `GET /api/runs`, но один объект.

### Clusters (Кластеры)

#### `GET /api/clusters?runId=6`

Получить кластеры для конкретного run.

**Response:**

```json
[
  {
    "id": 1,
    "title": "ai, cost, efficiency",
    "doc_count": 5,
    "avg_similarity": 0.45,
    "documents": [
      {
        "id": 67,
        "title": "Google hires Hume AI team",
        "url": "https://techcrunch.com/...",
        "similarity": 1.0
      }
    ]
  }
]
```


#### `GET /api/clusters/:id`

Детали конкретного кластера.

**Response:** один объект кластера с полным списком документов.

### Export (Экспорт)

#### `GET /api/export/:runId`

Скачать ZIP-архив с отчётами.

**Response:** Binary file `run-6-export.zip` содержит:

- `report.json` — полные данные
- `raw_documents.jsonl` — все документы построчно
- `report.md` — Markdown отчёт


### Search (Поиск)

#### `GET /api/search?q=ai&source=TechCrunch`

Поиск документов.

**Query params:**

- `q` — поисковый запрос (по title + text_preview)
- `source` — фильтр по источнику (опционально)
- `startDate` — от даты (опционально)
- `endDate` — до даты (опционально)

**Response:**

```json
{
  "results": [
    {
      "id": 67,
      "title": "Google hires Hume AI team",
      "text_preview": "Google has hired...",
      "url": "https://...",
      "source_name": "TechCrunch",
      "published_at": 1769094771000
    }
  ],
  "total": 15
}
```


### Logs (Логи)

#### `GET /api/logs?runId=6&level=error`

Получить логи worker.

**Query params:**

- `runId` — ID запуска (опционально, без него = все логи)
- `level` — фильтр по уровню: `info` | `warn` | `error`

**Response:**

```json
[
  {
    "timestamp": 1769115594906,
    "level": "info",
    "component": "worker",
    "message": "Starting run",
    "meta": {"runId": 6}
  }
]
```


## Установка и запуск

### Требования

- Node.js 24+ (рекомендуется 24.11.1)
- npm 10+
- macOS/Linux (Windows поддерживается, но не тестировалось)


### Шаг 1: Клонирование и установка

```bash
git clone https://github.com/mixamonakh/pain-analyzer.git
cd pain-analyzer
npm install
```


### Шаг 2: Инициализация БД

```bash
npx drizzle-kit push  # Применить схему
npm run seed          # Заполнить начальные данные
```

Это создаст:

- Файл `pain-analyzer.db`
- 3 preset источника (Habr, VC.ru, TechCrunch)
- Конфигурацию по умолчанию


### Шаг 3: Запуск worker (первый сбор)

```bash
npm run worker
```

Worker выполнит:

1. Загрузку RSS из всех источников
2. Парсинг и дедупликацию
3. Кластеризацию (TF-IDF + cosine similarity)
4. Экспорт отчётов в `/exports/run-X/`
5. Логирование в `/logs/run-X.jsonl`

Типичное время выполнения: **10-20 секунд** для 300-400 документов.

### Шаг 4: Запуск веб-интерфейса

```bash
npm run dev
```

Откройте http://localhost:3000

## Конфигурация

### Изменение настроек кластеризации

#### Через SQLite CLI

```bash
sqlite3 pain-analyzer.db "UPDATE config SET value='0.18' WHERE key='cluster_threshold'"
sqlite3 pain-analyzer.db "UPDATE config SET value='3' WHERE key='min_cluster_size'"
```


#### Через код (будущая админка)

```typescript
await db.update(config)
  .set({value: '0.18'})
  .where(eq(config.key, 'cluster_threshold'));
```


### Параметры кластеризации

**cluster_threshold** (0..1, default 0.22)

- Выше = меньше кластеров, но более качественных
- Ниже = больше кластеров, но менее связанных
- Рекомендуемый диапазон: 0.18-0.35

**min_cluster_size** (default 2)

- Минимум документов для формирования кластера
- Меньше = больше маленьких кластеров
- Больше = только крупные темы

**preview_length** (default 800)

- Длина text_preview для парсинга
- Больше = точнее кластеризация, но медленнее


### Добавление нового RSS-источника

#### Через UI

1. Откройте `/sources`
2. Нажмите "Добавить источник"
3. Введите название и URL RSS-ленты

#### Через API

```bash
curl -X POST http://localhost:3000/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "The Verge",
    "feed_url": "https://www.theverge.com/rss/index.xml",
    "plugin_type": "generic"
  }'
```


#### Через SQL

```bash
sqlite3 pain-analyzer.db "INSERT INTO sources (name, feed_url, plugin_type, enabled, created_at) VALUES ('The Verge', 'https://www.theverge.com/rss/index.xml', 'generic', 1, $(date +%s)000)"
```


## Workflow типичного использования

### 1. Ежедневный сбор (автоматизация)

```bash
# Добавить в crontab (macOS/Linux)
0 9,14,20 * * * cd /path/to/pain-analyzer && npm run worker >> /var/log/pain-analyzer.log 2>&1
```

Это запустит worker 3 раза в день: 9:00, 14:00, 20:00.

### 2. Просмотр результатов

1. Откройте http://localhost:3000
2. Выберите последний Run
3. Изучите найденные кластеры
4. Скачайте ZIP-отчёт при необходимости

### 3. Тонкая настройка

Если кластеры некачественные:

- Увеличьте `cluster_threshold` (меньше кластеров, но точнее)
- Увеличьте `min_cluster_size` (только крупные темы)
- Добавьте стоп-слова (см. `src/lib/tokenize.ts`)

Затем запустите новый Run и сравните.

## Roadmap

### ✅ Реализовано (v0.1)

- [x] RSS парсинг с retry и прокси
- [x] SQLite + Drizzle ORM
- [x] TF-IDF кластеризация
- [x] Next.js UI (dashboard, sources, clusters)
- [x] Экспорт в JSON/JSONL/MD/ZIP
- [x] Логирование (pino + SQLite + JSONL)
- [x] Дедупликация URL
- [x] API Routes для управления


### 🚧 В разработке (v0.2)

- [ ] Админка для config (UI вместо SQL)
- [ ] Страница `/documents` с поиском (FTS5)
- [ ] Расширенные стоп-слова (domain-specific)
- [ ] Автозапуск worker (launchd/systemd)
- [ ] Telegram уведомления
- [ ] GPT-генерация названий кластеров


### 🔮 Планируется (v0.3+)

- [ ] Plugin system (расширяемые парсеры)
- [ ] Normalization layer (единый формат документов)
- [ ] Processing pipeline (job queue)
- [ ] Analytics dashboard (тренды, метрики)
- [ ] Webhook integrations (Zapier, Make)
- [ ] AI-ассистент в UI (чат про кластеры)
- [ ] Миграция на PostgreSQL (опционально)
- [ ] Docker + CI/CD


## Решение проблем

### Worker не запускается

```bash
# Проверьте БД
sqlite3 pain-analyzer.db ".tables"

# Если таблицы нет, запустите seed
npm run seed
```


### Кластеры не создаются

```bash
# Снизьте порог
sqlite3 pain-analyzer.db "UPDATE config SET value='0.18' WHERE key='cluster_threshold'"

# Снизьте min_cluster_size
sqlite3 pain-analyzer.db "UPDATE config SET value='2' WHERE key='min_cluster_size'"
```


### Источник не загружается (timeout)

- Проверьте URL в браузере
- Увеличьте `fetch_timeout_ms` в config
- Удалите источник, если он недоступен:

```bash
curl -X DELETE http://localhost:3000/api/sources/4
```


### Next.js не стартует

```bash
# Очистите кеш
rm -rf .next
npm run dev
```


## Вклад в проект

### Архитектурные принципы

1. **Простота** — SQLite вместо Postgres, универсальный парсер вместо специфичных
2. **Модульность** — lib функции независимы, легко тестировать
3. **Расширяемость** — plugin_type готов для будущих кастомных парсеров
4. **Логирование** — все действия worker пишутся в logs

### Стиль кода

- TypeScript strict mode
- ESLint + Prettier (автоформатирование)
- Функциональный подход (pure functions где возможно)
- Комментарии на русском в сложных местах


### Как добавить новую фичу

1. Создайте issue в GitHub (опишите проблему)
2. Форкните репозиторий
3. Создайте ветку `feature/название`
4. Напишите код + тесты (если применимо)
5. Сделайте PR с описанием изменений

## Лицензия

MIT

## Автор

**Миша (mixamonakh)**
Frontend Developer, Moscow
GitHub: https://github.com/mixamonakh

---
