'use client';

import { useState } from 'react';
import Button from './ui/Button';

interface DocumentFiltersProps {
  onFilter: (filters: {
    source?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  sources: string[];
}

export default function DocumentFilters({ onFilter, sources }: DocumentFiltersProps) {
  const [source, setSource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  const handleApply = () => {
    // Валидация дат на клиенте
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateError('Начальная дата должна быть раньше конечной');
      return;
    }

    setDateError('');
    onFilter({
      source: source || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handleReset = () => {
    setSource('');
    setStartDate('');
    setEndDate('');
    setDateError('');
    onFilter({});
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-zinc-100">Фильтры</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Источник</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">Все источники</option>
            {sources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">От даты</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateError('');
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">До даты</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateError('');
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {dateError && (
        <div className="text-red-400 text-sm">
          {dateError}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleApply} variant="primary">
          Применить
        </Button>
        <Button onClick={handleReset} variant="outline">
          Сбросить
        </Button>
      </div>
    </div>
  );
}
