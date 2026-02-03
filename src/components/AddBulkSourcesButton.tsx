'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Modal from './Modal';

export default function AddBulkSourcesButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [urlsText, setUrlsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; failed: number; errors: string[] } | null>(
    null
  );

  const handleAdd = async () => {
    if (!urlsText.trim()) {
      alert('Вставь список URL');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/sources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsText }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        if (data.added > 0) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('Error adding sources:', err);
      alert('Ошибка при добавлении источников');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        + Массовое добавление
      </Button>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Массовое добавление источников</h2>
              <p className="text-sm text-zinc-400">
                Вставь список URL (один на строку). Поддержка RSS и Telegram.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Список URL</label>
              <textarea
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder={`https://example.com/feed.xml
@forklog
https://t.me/crypto
@channel | Моё название (опционально)`}
                className="w-full h-64 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                disabled={loading}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Формат: <code>URL</code> или <code>URL | Название</code>
              </p>
            </div>

            {result && (
              <div
                className={`p-3 rounded-lg ${
                  result.failed > 0 ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-green-900/20 border border-green-700'
                }`}
              >
                <p className="font-semibold">
                  Добавлено: {result.added} | Ошибок: {result.failed}
                </p>
                {result.errors.length > 0 && (
                  <ul className="text-xs mt-2 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-red-400">
                        • {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={loading}>
                Закрыть
              </Button>
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? 'Добавление...' : 'Добавить всё'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
