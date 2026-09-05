import { useCallback, useEffect, useState } from 'react';
import { getApiError, USE_MOCK_FALLBACK } from '../services/api';

// Fetch a master-data list from the live API, falling back to local mock data
// when the backend is unreachable (offline demo mode).
// fetcher: () => Promise<{data}> resolving to { <key>: [...] } e.g. { contacts: [...] }
export const useLiveList = (fetcher, dataKey, mockData) => {
  const [data, setData] = useState(mockData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetcher();
      setData(res.data?.[dataKey] || []);
      setLive(true);
    } catch (err) {
      if (USE_MOCK_FALLBACK) {
        setData(mockData || []);
        setLive(false);
      } else {
        setError(getApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, dataKey, mockData]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, setData, loading, error, live, refresh };
};

export const phoneOf = (c) => c?.phone || c?.mobile || '—';
