"use client";

import type { InspirationItem } from "@/lib/types";
import { useCallback, useRef, useState } from "react";
import { resonanceFetch } from "./use-resonance-fetch";

const DEBOUNCE_MS = 1500;

interface UseResonanceTriggerOptions {
  apiUrl?: string;
  /** Optional: pass to resonate API (e.g. libraryId for user library). */
  bodyExtra?: Record<string, unknown>;
}

export function useResonanceTrigger({
  apiUrl = "/api/resonate",
  bodyExtra = {},
}: UseResonanceTriggerOptions = {}) {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuery = useRef("");

  const mergeItems = useCallback((newItems: InspirationItem[]) => {
    if (newItems.length === 0) return;
    setItems((prev) => {
      const merged = [...newItems, ...prev];
      const seen = new Set<string>();
      return merged.filter((it) => {
        if (seen.has(it.text)) return false;
        seen.add(it.text);
        return true;
      });
    });
  }, []);

  const trigger = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return;
      if (trimmed === lastQuery.current) return;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        lastQuery.current = trimmed;

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        const triggerStartedAt = Date.now();

        const newItems = await resonanceFetch({
          query: trimmed,
          signal: controller.signal,
          apiUrl,
          bodyExtra,
        });

        if (controller.signal.aborted) {
          setLoading(false);
          return;
        }
        mergeItems(newItems);
        if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
          const elapsed = Date.now() - triggerStartedAt;
          console.log(`[StyleEvent] resonate latency: ${elapsed}ms`);
        }
        setLoading(false);
      }, DEBOUNCE_MS);
    },
    [apiUrl, bodyExtra, mergeItems],
  );

  const triggerImmediate = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      lastQuery.current = "";

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const triggerStartedAt = Date.now();

      (async () => {
        const newItems = await resonanceFetch({
          query: trimmed,
          signal: controller.signal,
          apiUrl,
          bodyExtra,
        });
        if (controller.signal.aborted) {
          setLoading(false);
          return;
        }
        mergeItems(newItems);
        if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
          const elapsed = Date.now() - triggerStartedAt;
          console.log(`[StyleEvent] resonate latency: ${elapsed}ms`);
        }
        setLoading(false);
      })();
    },
    [apiUrl, bodyExtra, mergeItems],
  );

  const clearItems = useCallback(() => {
    setItems([]);
    lastQuery.current = "";
  }, []);

  return { items, loading, trigger, triggerImmediate, clearItems };
}
