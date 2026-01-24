'use client';

import { useState, useEffect } from 'react';
import ClusterSearch from './ClusterSearch';
import ClustersList from './ClustersList';

export default function ClustersListWithSearch({ runId }: { runId: number }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <ClusterSearch onSearch={setSearchQuery} />
      <ClustersList runId={runId} searchQuery={searchQuery} />
    </div>
  );
}
