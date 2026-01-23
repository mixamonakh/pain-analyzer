'use client';

import { useState } from 'react';
import Input from './ui/Input';

interface SearchInputProps {
  onSearch: (query: string) => void;
}

export default function SearchInput({ onSearch }: SearchInputProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={query}
        onChange={handleChange}
        placeholder="Поиск: AI, нейросети, генерация..."
        className="text-lg py-3"
      />
    </div>
  );
}
