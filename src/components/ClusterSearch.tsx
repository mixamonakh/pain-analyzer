'use client';

import { useState, useEffect, useRef } from 'react';

interface ClusterSearchProps {
  onSearch: (query: string) => void;
}

export default function ClusterSearch({ onSearch }: ClusterSearchProps) {
  const [query, setQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
