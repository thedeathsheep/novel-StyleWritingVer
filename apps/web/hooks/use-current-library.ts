"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "styleevent-current-library-id";

export function useCurrentLibrary() {
  const [currentLibraryId, setCurrentLibraryIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setCurrentLibraryIdState(stored || null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const setCurrentLibraryId = useCallback((id: string | null) => {
    setCurrentLibraryIdState(id);
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    currentLibraryId: hydrated ? currentLibraryId : null,
    setCurrentLibraryId,
    hydrated,
  };
}
