export const runtime = 'nodejs';

import type { Metadata } from 'next';
import './globals.css';
import UiLink from '@/components/ui/Link';

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
        <header className="border-b border-zinc-800 bg-zinc-950">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="font-semibold">pain-analyzer</div>
            <nav className="flex gap-4 text-sm">
              <UiLink href="/">Dashboard</UiLink>
              <UiLink href="/sources">Источники</UiLink>
              <UiLink href="/documents">Документы</UiLink>
              <UiLink href="/search">Поиск</UiLink>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
