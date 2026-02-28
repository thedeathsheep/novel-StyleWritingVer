"use client";

import type { InspirationItem } from "@/lib/types";
import { useCallback, useRef, useState } from "react";

const DEBOUNCE_MS = 1500;
const TIMEOUT_MS = 2000;

interface UseResonanceTriggerOptions {
  apiUrl?: string;
}

export function useResonanceTrigger({ apiUrl = "/api/resonate" }: UseResonanceTriggerOptions = {}) {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuery = useRef("");

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

        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: trimmed }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!res.ok) {
            setLoading(false);
            return;
          }

          const data = await res.json();
          if (controller.signal.aborted) return;

          const newItems: InspirationItem[] = data.items ?? [];
          if (newItems.length > 0) {
            setItems((prev) => {
              const merged = [...newItems, ...prev];
              const seen = new Set<string>();
              return merged.filter((it) => {
                if (seen.has(it.text)) return false;
                seen.add(it.text);
                return true;
              });
            });
          }
          if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
            const elapsed = Date.now() - triggerStartedAt;
            console.log(`[StyleEvent] resonate latency: ${elapsed}ms`);
          }
        } catch {
          // aborted or network error — silent
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [apiUrl],
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

      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      (async () => {
        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: trimmed }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!res.ok) {
            setLoading(false);
            return;
          }

          const data = await res.json();
          if (controller.signal.aborted) return;

          const newItems: InspirationItem[] = data.items ?? [];
          if (newItems.length > 0) {
            setItems((prev) => {
              const merged = [...newItems, ...prev];
              const seen = new Set<string>();
              return merged.filter((it) => {
                if (seen.has(it.text)) return false;
                seen.add(it.text);
                return true;
              });
            });
          }
          if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
            const elapsed = Date.now() - triggerStartedAt;
            console.log(`[StyleEvent] resonate latency: ${elapsed}ms`);
          }
        } catch {
          // silent
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      })();
    },
    [apiUrl],
  );

  const clearItems = useCallback(() => {
    setItems([]);
    lastQuery.current = "";
  }, []);

  return { items, loading, trigger, triggerImmediate, clearItems };
}
