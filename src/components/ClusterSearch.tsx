'use client';

import { useState } from 'react';

interface ClusterSearchProps {
  onSearch: (query: string) => void;
}

export default function ClusterSearch({ onSearch }: ClusterSearchProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="Поиск по кластерам..."
        value={query}
        onChange={handleChange}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
