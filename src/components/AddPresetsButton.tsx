'use client';

import { useState } from 'react';
import Button from './ui/Button';

export default function AddPresetsButton() {
  const [loading, setLoading] = useState(false);

  const handleAddPresets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sources/presets', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        console.error('Failed to add presets:', await res.text());
      }
    } catch (err) {
      console.error('Error adding presets:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAddPresets} disabled={loading} variant="secondary">
      {loading ? 'Добавление...' : '⭐ Добавить пресеты'}
    </Button>
  );
}
