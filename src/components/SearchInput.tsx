'use client';

import { useState } from 'react';
import Input from './ui/Input';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchInput({ onSearch, placeholder = 'Поиск...' }: SearchInputProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex gap-2">
      <Input
        name="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}
