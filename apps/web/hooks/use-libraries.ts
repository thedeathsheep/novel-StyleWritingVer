"use client";

import type { Library } from "@/lib/types";
import { useCallback, useState } from "react";

const API = "/api/libraries";

export type LibraryWithCount = Library & { chunksCount: number };

export function useLibraries() {
  const [libraries, setLibraries] = useState<LibraryWithCount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = (await res.json()) as { libraries: LibraryWithCount[] };
      setLibraries(Array.isArray(data.libraries) ? data.libraries : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLibrary = useCallback(
    async (name: string): Promise<LibraryWithCount | null> => {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return null;
      const lib = (await res.json()) as Library;
      const withCount: LibraryWithCount = { ...lib, chunksCount: 0 };
      setLibraries((prev) => [...prev, withCount]);
      return withCount;
    },
    [],
  );

  const deleteLibrary = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    setLibraries((prev) => prev.filter((l) => l.id !== id));
    return true;
  }, []);

  return {
    libraries,
    loading,
    fetchLibraries,
    createLibrary,
    deleteLibrary,
  };
}
