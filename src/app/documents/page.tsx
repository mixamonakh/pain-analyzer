'use client';

import { useState, useEffect } from 'react';
import DocumentCard from '@/components/DocumentCard';
import DocumentFilters from '@/components/DocumentFilters';
import Button from '@/components/ui/Button';

interface Document {
  id: number;
  url: string;
  title: string;
  text_preview: string;
  fetched_at: number;
  source_name: string;
  published_at: number | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [filters, setFilters] = useState<{
    source?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const perPage = 50;

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [page, filters]);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      setSources(data.map((s: any) => s.name));
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        ...(filters.source && { source: filters.source }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const res = await fetch(`/api/documents?${params}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }

      const data = await res.json();

      setDocuments(data.documents);
      setTotal(data.total);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch documents';
      setError(errorMsg);
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-100">Документы</h1>
        <div className="text-zinc-400">
          Всего: {total}
        </div>
      </div>

      <DocumentFilters onFilter={handleFilter} sources={sources} />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-12">Загрузка...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                ← Назад
              </Button>

              <span className="text-zinc-400 px-4">
                Страница {page} из {totalPages}
              </span>

              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                Вперёд →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
