'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './Modal';

export default function AddSourceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !feedUrl.trim()) {
      alert('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          feed_url: feedUrl,
          plugin_type: 'generic',
        }),
      });

      if (res.ok) {
        setName('');
        setFeedUrl('');
        setIsOpen(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error adding source:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        + Добавить RSS
      </Button>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Название</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: My Blog"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">RSS URL</label>
              <Input
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? 'Добавление...' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
