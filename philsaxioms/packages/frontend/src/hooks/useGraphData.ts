import { useState, useEffect } from 'react';
import { GraphData } from '@philsaxioms/shared';
import { apiClient } from '../utils/api';

export function useGraphData() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const graphData = await apiClient.fetchGraphData();
        setData(graphData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error, refetch: () => setLoading(true) };
}