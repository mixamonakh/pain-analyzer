'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './Modal';

type SourceType = 'rss' | 'telegram';

export default function AddSourceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('rss');
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
          plugin_type: sourceType,
        }),
      });

      if (res.ok) {
        setName('');
        setFeedUrl('');
        setSourceType('rss');
        setIsOpen(false);
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('Error adding source:', err);
      alert('Ошибка при добавлении источника');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (sourceType) {
      case 'telegram':
        return '@durov или https://t.me/durov';
      case 'rss':
      default:
        return 'https://example.com/feed.xml';
    }
  };

  const getUrlLabel = () => {
    switch (sourceType) {
      case 'telegram':
        return 'Telegram канал';
      case 'rss':
      default:
        return 'RSS URL';
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        + Добавить источник
      </Button>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-4">Добавить источник</h2>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Тип источника</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType('rss')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    sourceType === 'rss'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  RSS
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('telegram')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    sourceType === 'telegram'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  Telegram
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Название</label>
              <Input
                name="source-name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={
                  sourceType === 'telegram'
                    ? 'Название канала (например, Павел Дуров)'
                    : 'Название источника (например, РБК)'
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{getUrlLabel()}</label>
              <Input
                name="source-url"
                value={feedUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeedUrl(e.target.value)}
                placeholder={getPlaceholder()}
              />
              {sourceType === 'telegram' && (
                <p className="text-xs text-zinc-500 mt-1">
                  Форматы: @channel, t.me/channel или t.me/s/channel
                </p>
              )}
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
