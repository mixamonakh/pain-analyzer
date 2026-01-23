'use client';

import { useState } from 'react';
import Button from './ui/Button';

interface ExportButtonProps {
  runId: number;
}

export default function ExportButton({ runId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/${runId}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run-${runId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Ошибка при скачивании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="secondary">
      {loading ? 'Загрузка...' : '📦 Скачать ZIP'}
    </Button>
  );
}
