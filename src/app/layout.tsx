export const runtime = 'nodejs';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pain Analyzer',
  description: 'RSS clustering & search',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body>
        <nav className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-8">
            <a href="/" className="text-xl font-bold">
              Pain Analyzer
            </a>
            <div className="flex gap-4 text-sm">
              <a href="/sources" className="hover:text-blue-400">
                Источники
              </a>
              <a href="/search" className="hover:text-blue-400">
                Поиск
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
