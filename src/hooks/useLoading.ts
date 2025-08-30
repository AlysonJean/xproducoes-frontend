import { useState, useCallback } from 'react';

export function useLoading(initial: boolean = false) {
  const [loading, setLoading] = useState(initial);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);
  const toggleLoading = useCallback(() => setLoading((l) => !l), []);

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
  };
}
