// src/components/processing/ProcessingPanel.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ProcessorMeta = {
  id: string;
  name?: string;
  description?: string;
};

type PipelineStep = {
  order: number;
  id: string;
  enabled: boolean;
  config: Record<string, any>;
};

type PipelineConfig = {
  processors: PipelineStep[];
};

type StageStatsDto = {
  order: number;
  processorId: string;
  processorName: string;
  itemsIn: number;
  itemsOut: number;
  itemsRemoved: number;
  clustersCreated?: number;
  durationMs: number;
  metadata?: Record<string, any>;
};

type PreviewResponse = {
  stages: StageStatsDto[];
  itemsCount: number;
  clustersCount: number;
  sampleItems: Array<{
    id: number;
    title: string;
    url: string;
    text: string;
    sourceName: string;
  }>;
  clusters?: any[];
};

type VersionListItem = {
  id: number;
  version: number;
  createdAt: number;
  stats: any;
};

type VersionDetails = {
  id: number;
  version: number;
  createdAt: number;
  pipeline: PipelineConfig;
  stats: any;
  stages: StageStatsDto[];
};

function safeJsonParse(input: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function toLocalTime(seconds: number): string {
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleString();
}

export default function ProcessingPanel({ runId }: { runId: number }) {
  const [processors, setProcessors] = useState<ProcessorMeta[]>([]);
  const [pipeline, setPipeline] = useState<PipelineConfig>({ processors: [] });
  const autoPreviewRef = useRef(false);

  const [sampleLimit, setSampleLimit] = useState<number>(50);

  const [loadingProcessors, setLoadingProcessors] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [activeVersion, setActiveVersion] = useState<VersionDetails | null>(null);

  const [error, setError] = useState<string | null>(null);

  const pipelineById = useMemo(() => {
    return new Map(pipeline.processors.map(p => [p.id, p]));
  }, [pipeline.processors]);

  async function loadProcessors() {
    setLoadingProcessors(true);
    setError(null);

    try {
      const res = await fetch('/api/processing/processors', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data?.processors) ? (data.processors as ProcessorMeta[]) : [];
      setProcessors(list);

      // Инициализируем дефолтный пайплайн один раз (если пусто)
      setPipeline(prev => {
        if (prev.processors.length > 0) return prev;

        const steps: PipelineStep[] = list.map((p, idx) => ({
          order: (idx + 1) * 10,
          id: p.id,
          enabled: false,
          config: {},
        }));

        return { processors: steps };
      });
    } catch (e) {
      setError(`Не смог загрузить процессоры: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingProcessors(false);
    }
  }

  async function loadVersions() {
    setLoadingVersions(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/versions`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data?.versions) ? (data.versions as VersionListItem[]) : [];
      setVersions(list);
    } catch (e) {
      setError(`Не смог загрузить версии: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function runPreview() {
    setLoadingPreview(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch(`/api/runs/${runId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline,
          sampleLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      setPreview(data as PreviewResponse);
    } catch (e) {
      setError(`Preview упал: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function saveVersion() {
    setSavingVersion(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      await loadVersions();
    } catch (e) {
      setError(`Не смог сохранить версию: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingVersion(false);
    }
  }

  async function openVersion(versionId: number) {
    setError(null);
    setActiveVersion(null);

    try {
      const res = await fetch(`/api/runs/${runId}/versions/${versionId}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as VersionDetails;
      setActiveVersion(data);
    } catch (e) {
      setError(`Не смог открыть версию: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    void loadProcessors();
    void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  function updateStep(stepId: string, patch: Partial<PipelineStep>) {
    setPipeline(prev => ({
      processors: prev.processors.map(p => (p.id === stepId ? { ...p, ...patch } : p)),
    }));
  }

  function resetToAllDisabled() {
    const steps: PipelineStep[] = processors.map((p, idx) => ({
      order: (idx + 1) * 10,
      id: p.id,
      enabled: false,
      config: {},
    }));
    setPipeline({ processors: steps });
  }

  useEffect(() => {
    if (autoPreviewRef.current) return;
    if (processors.length === 0 || pipeline.processors.length === 0) return;
    autoPreviewRef.current = true;
    void runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processors.length, pipeline.processors.length]);

  return (
    <div className="bg-zinc-900 p-4 rounded border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Processing</div>
          <div className="text-sm text-zinc-400">Preview → сохранить версию → сравнить стейджи</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetToAllDisabled}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
            disabled={loadingProcessors || processors.length === 0}
          >
            Сбросить
          </button>
          <button
            onClick={loadProcessors}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
            disabled={loadingProcessors}
          >
            {loadingProcessors ? 'Загрузка…' : 'Обновить процессоры'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Пайплайн</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">sampleLimit</span>
            <input
              type="number"
              value={sampleLimit}
              onChange={e => setSampleLimit(parseInt(e.target.value || '0'))}
              className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
              min={1}
              max={500}
            />
          </div>
        </div>

        <div className="overflow-auto border border-zinc-800 rounded">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="text-left p-2 w-12">On</th>
                <th className="text-left p-2 w-24">Order</th>
                <th className="text-left p-2">Processor</th>
                <th className="text-left p-2">Config (JSON)</th>
              </tr>
            </thead>
            <tbody>
              {processors.map(meta => {
                const step = pipelineById.get(meta.id);
                const enabled = step?.enabled ?? false;
                const order = step?.order ?? 0;

                return (
                  <tr key={meta.id} className="border-t border-zinc-800">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => {
                          if (!step) {
                            setPipeline(prev => ({
                              processors: [
                                ...prev.processors,
                                { order: 10, id: meta.id, enabled: e.target.checked, config: {} },
                              ],
                            }));
                            return;
                          }
                          updateStep(meta.id, { enabled: e.target.checked });
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={order}
                        onChange={e => updateStep(meta.id, { order: parseInt(e.target.value || '0') })}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-zinc-200">{meta.name || meta.id}</div>
                      <div className="text-xs text-zinc-500">{meta.id}</div>
                      {meta.description && (
                        <div className="text-xs text-zinc-400 mt-1">{meta.description}</div>
                      )}
                    </td>
                    <td className="p-2">
                      <textarea
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 font-mono text-xs"
                        value={JSON.stringify(step?.config ?? {}, null, 2)}
                        onChange={e => {
                          const parsed = safeJsonParse(e.target.value);
                          if (!parsed.ok) {
                            setError(`Config JSON для ${meta.id}: ${parsed.error}`);
                            return;
                          }
                          setError(null);
                          updateStep(meta.id, { config: parsed.value || {} });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}

              {processors.length === 0 && (
                <tr>
                  <td className="p-3 text-zinc-500" colSpan={4}>
                    Процессоры не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runPreview}
            disabled={loadingPreview || pipeline.processors.length === 0}
            className="px-4 py-2 rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 text-sm font-semibold disabled:opacity-50"
          >
            {loadingPreview ? 'Preview…' : 'Запустить Preview'}
          </button>

          <button
            onClick={saveVersion}
            disabled={savingVersion || pipeline.processors.length === 0}
            className="px-4 py-2 rounded bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 text-sm font-semibold disabled:opacity-50"
          >
            {savingVersion ? 'Сохраняю…' : 'Сохранить версию'}
          </button>

          <button
            onClick={loadVersions}
            disabled={loadingVersions}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
          >
            {loadingVersions ? 'Обновляю…' : 'Обновить версии'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="font-semibold">Preview результат</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <div className="text-zinc-400 text-xs">Документов на выходе</div>
              <div className="text-xl font-bold">{preview.itemsCount}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <div className="text-zinc-400 text-xs">Кластеров</div>
              <div className="text-xl font-bold">{preview.clustersCount}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 col-span-2">
              <div className="text-zinc-400 text-xs">Стейджей</div>
              <div className="text-xl font-bold">{preview.stages.length}</div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
            <div className="text-sm font-semibold mb-2">Стейджи</div>
            <div className="space-y-2">
              {preview.stages.map(s => (
                <div key={`${s.order}:${s.processorId}`} className="text-sm flex flex-wrap gap-3">
                  <span className="text-zinc-400">#{s.order}</span>
                  <span className="font-semibold">{s.processorName}</span>
                  <span className="text-zinc-400">{s.itemsIn} → {s.itemsOut} (−{s.itemsRemoved})</span>
                  <span className="text-zinc-500">{s.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
            <div className="text-sm font-semibold mb-2">Примеры документов</div>
            <div className="space-y-2">
              {preview.sampleItems?.slice(0, 10).map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2 rounded border border-zinc-800 hover:bg-zinc-900"
                >
                  <div className="text-sm font-semibold">{item.title || '(без заголовка)'}</div>
                  <div className="text-xs text-zinc-400">{item.sourceName}</div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.text}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="font-semibold">Версии</div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
            <div className="text-sm font-semibold mb-2">Список</div>

            <div className="space-y-2">
              {versions.map(v => (
                <button
                  key={v.id}
                  onClick={() => openVersion(v.id)}
                  className="w-full text-left p-2 rounded border border-zinc-800 hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">v{v.version}</div>
                    <div className="text-xs text-zinc-500">{toLocalTime(v.createdAt)}</div>
                  </div>
                  {v.stats && (
                    <div className="text-xs text-zinc-400 mt-1">
                      docs: {v.stats.totalDocuments ?? '—'}, clusters: {v.stats.totalClusters ?? '—'}
                    </div>
                  )}
                </button>
              ))}

              {versions.length === 0 && (
                <div className="text-sm text-zinc-500">Пока версий нет.</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
            <div className="text-sm font-semibold mb-2">Детали</div>

            {!activeVersion && (
              <div className="text-sm text-zinc-500">Выбери версию слева.</div>
            )}

            {activeVersion && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">v{activeVersion.version}</div>
                  <div className="text-xs text-zinc-500">{toLocalTime(activeVersion.createdAt)}</div>
                </div>

                <div className="text-xs text-zinc-400">
                  processors: {activeVersion.pipeline?.processors?.length ?? 0}, stages: {activeVersion.stages?.length ?? 0}
                </div>

                <div className="mt-2">
                  <div className="text-xs text-zinc-500 mb-1">Stages</div>
                  <div className="space-y-1">
                    {activeVersion.stages.map(s => (
                      <div key={`${s.order}:${s.processorId}`} className="text-xs">
                        <span className="text-zinc-500">#{s.order}</span>{' '}
                        <span className="font-semibold">{s.processorName}</span>{' '}
                        <span className="text-zinc-500">{s.itemsIn}→{s.itemsOut}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
