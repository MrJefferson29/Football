import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CacheData {
  [key: string]: {
    data: any;
    timestamp: number;
    error?: string;
  };
}

interface DataCacheContextType {
  cache: CacheData;
  setCacheData: (key: string, data: any, error?: string) => void;
  getCacheData: (key: string) => any | null;
  clearCache: (key?: string) => void;
  isCached: (key: string) => boolean;
  preloading: boolean;
  setPreloading: (loading: boolean) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const DataCacheProvider = ({ children }: { children: ReactNode }) => {
  const [cache, setCache] = useState<CacheData>({});
  const [preloading, setPreloading] = useState(false);

  const setCacheData = useCallback((key: string, data: any, error?: string) => {
    setCache((prev) => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        error,
      },
    }));
  }, []);

  const getCacheData = useCallback(
    (key: string) => {
      const cached = cache[key];
      if (!cached) return null;
      
      // Optional: Check if cache is stale (older than 5 minutes)
      const maxAge = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - cached.timestamp > maxAge) {
        return null; // Consider it stale
      }
      
      return cached.error ? null : cached.data;
    },
    [cache]
  );

  const isCached = useCallback(
    (key: string) => {
      return !!cache[key] && !cache[key].error;
    },
    [cache]
  );

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        cache,
        setCacheData,
        getCacheData,
        clearCache,
        isCached,
        preloading,
        setPreloading,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};
