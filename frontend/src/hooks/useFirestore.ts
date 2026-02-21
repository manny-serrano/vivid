import { useState, useEffect } from 'react';

export interface TwinStatusDoc {
  status: 'processing' | 'ready' | 'error';
  twinId?: string;
  error?: string;
  updatedAt?: string;
}

/**
 * Skeleton: in production, subscribe to Firestore twinStatus/{userId} for real-time updates.
 */
export function useFirestoreTwinStatus(_userId: string | null): TwinStatusDoc | null {
  const [doc, setDoc] = useState<TwinStatusDoc | null>(null);
  useEffect(() => {
    if (!_userId) return;
    setDoc({ status: 'ready', updatedAt: new Date().toISOString() });
    return () => setDoc(null);
  }, [_userId]);
  return doc;
}
