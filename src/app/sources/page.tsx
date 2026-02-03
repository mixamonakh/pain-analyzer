export const runtime = 'nodejs';

import { db } from '@/db';
import SourcesList from '@/components/SourcesList';
import AddSourceButton from '@/components/AddSourceButton';
import AddPresetsButton from '@/components/AddPresetsButton';
import AddBulkSourcesButton from '@/components/AddBulkSourcesButton';

export default async function SourcesPage() {
  const sources = await db.query.sources.findMany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Источники данных</h1>
        <p className="text-zinc-400">Управление RSS-фидами и Telegram-каналами</p>
      </div>

      <div className="flex gap-4">
        <AddBulkSourcesButton />
        <AddPresetsButton />
        <AddSourceButton />
      </div>

      <div className="mt-8">
        <SourcesList initialSources={sources} />
      </div>
    </div>
  );
}
