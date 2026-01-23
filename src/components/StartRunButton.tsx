'use client'

import { useState } from 'react';
import Button from './ui/Button';

export default function StartRunButton() {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/runs/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error starting run:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleStart} disabled={loading} size="lg">
      {loading ? 'Загрузка...' : '▶ Запустить сбор'}
    </Button>
  );
}
