# Pain Analyzer — короткая дока для анализа репозитория

Проект построен вокруг идеи “источники → коннекторы → сырые элементы (RawItem) → дальнейшая обработка воркером”.
Коннекторы выбираются по `plugin_type` источника через единый реестр `getConnector(type)`.

## 1) Ключевая архитектура
Есть реестр коннекторов `src/lib/connectors/index.ts`, который мапит `ConnectorType` → реализация `IConnector`.
Контракт коннектора принципиальный: `fetch(config)` **не пишет** в БД, а только возвращает `{ items, errors }`.

Мини-схема:
sources(plugin_type, feed_url/ url) -> getConnector(type) -> connector.fetch(config)
-> FetchResult(items: RawItem[], errors: string[])
-> дальше: воркер/пайплайн проекта сохраняет и обрабатывает


## 2) Коннекторы (как расширять)
`ConnectorType` сейчас ограничен тремя значениями: `rss | telegram | html`.
В реестре реализован `rss: new RssConnector()`, а `telegram` и `html` — заглушки, которые бросают `Error("... not implemented yet")`.

Чтобы добавить новый коннектор без распухания кода:
- Добавить новый тип в `ConnectorType` (и связанные типы при необходимости).
- Создать класс/объект, реализующий `IConnector` (`type` + `fetch`).
- Прописать его в `connectorsRegistry` в `src/lib/connectors/index.ts`.

## 3) Контракты данных (RawItem / FetchResult)
`RawItem` — это универсальный “сырой элемент” от любого источника: у него есть `externalId`, `url`, `title`, `text`, `contentType`, `contentBody` и опциональные поля (`html`, `author`, `publishedAt`, `mediaJson`, `meta`).
`contentType` нормализован до `'html' | 'json' | 'text'`, а `publishedAt` — Unix timestamp (ms) или `null`.
Возврат коннектора всегда в виде `FetchResult { items: RawItem[]; errors: string[] }`, чтобы пайплайн мог частично завершаться даже при проблемах конкретных элементов.

`ConnectorConfig` — общий конфиг вызова коннектора: `sourceId`, `sourceName`, `url`, `pluginType`, таймаут/задержка, `maxItems`, опционально `proxyUrl`.

## 4) Схема БД (ориентиры)
Схема и связи описаны в Drizzle через `src/db/schema.ts`, реэкспорт таблиц идёт из `./tables`. 
По связям видно, что `sources` связан с `documents`, `runs` связан с `documents/clusters/logs`, а `documents` и `clusters` связаны через `cluster_documents` (many-to-many). 
`documents` также связан с `runs` и `sources`, а `logs` связан с `runs` (если `run_id` задан). 

## 5) Где читать код (точки входа)
- Коннекторный слой: `src/lib/connectors/index.ts`, типы: `src/lib/connectors/types.ts`.
- Схема данных и связи: `src/db/schema.ts` (таблицы — в `src/db/tables`). 

Принцип, который держит репу “нераздувающейся”: коннекторы возвращают унифицированные `RawItem`, а всё сохранение/кластеризация/экспорт живёт выше по пайплайну и не протекает внутрь источников.
