'use client';

import { useState } from 'react';
import DocumentCard from '@/components/DocumentCard';
import SearchInput from '@/components/SearchInput';

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Поиск документов</h1>
        <p className="text-zinc-400">Полнотекстовый поиск по всем документам (FTS5)</p>
      </div>

      <SearchInput onSearch={handleSearch} />

      {query && (
        <div className="text-zinc-400 text-sm">
          Найдено: <span className="font-semibold text-zinc-100">{results.length}</span> документов
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-zinc-400">Загрузка...</div>
        ) : results.length > 0 ? (
          results.map((doc) => <DocumentCard key={doc.id} doc={doc} />)
        ) : query ? (
          <div className="text-zinc-400">Ничего не найдено</div>
        ) : null}
      </div>
    </div>
  );
}
