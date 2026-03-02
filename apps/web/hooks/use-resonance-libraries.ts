"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "styleevent-resonance-libraries";

export interface ResonanceLibraryEntry {
  id: string;
  weight: number;
}

const DEFAULT_WEIGHT = 0.5;

function loadStored(): ResonanceLibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ResonanceLibraryEntry =>
        e && typeof e.id === "string" && typeof e.weight === "number" && e.weight > 0
    );
  } catch {
    return [];
  }
}

export function useResonanceLibraries() {
  const [libraries, setLibrariesState] = useState<ResonanceLibraryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLibrariesState(loadStored());
    setHydrated(true);
  }, []);

  const setLibraries = useCallback((next: ResonanceLibraryEntry[] | ((prev: ResonanceLibraryEntry[]) => ResonanceLibraryEntry[])) => {
    setLibrariesState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const filtered = value.filter((e) => e.id && e.weight > 0);
      if (typeof window !== "undefined") {
        if (filtered.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        else window.localStorage.removeItem(STORAGE_KEY);
      }
      return filtered;
    });
  }, []);

  const addLibrary = useCallback((id: string, weight = DEFAULT_WEIGHT) => {
    setLibraries((prev) => {
      if (prev.some((e) => e.id === id)) return prev;
      return [...prev, { id, weight }];
    });
  }, [setLibraries]);

  const removeLibrary = useCallback((id: string) => {
    setLibraries((prev) => prev.filter((e) => e.id !== id));
  }, [setLibraries]);

  const setWeight = useCallback((id: string, weight: number) => {
    setLibraries((prev) => prev.map((e) => (e.id === id ? { ...e, weight } : e)));
  }, [setLibraries]);

  return {
    libraries: hydrated ? libraries : [],
    setLibraries,
    addLibrary,
    removeLibrary,
    setWeight,
    hydrated,
  };
}
