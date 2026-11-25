"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Current time, updated every `intervalMs`. Null on the server to avoid hydration mismatches. */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * State persisted on the PC (PostgreSQL) under app_data(appId, key).
 * Updates are saved with a short debounce; loaded flag tells you when the server value arrived.
 */
export function useAppState<T>(
  appId: string,
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<T>(initial);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    void fetch(`/api/data/${appId}/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: latest.current }),
    }).catch(() => {});
  }, [appId, key]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/data/${appId}/${key}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { value?: T } | null) => {
        if (alive && !dirty.current && d && d.value !== undefined) {
          latest.current = d.value;
          setValue(d.value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [appId, key]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      save();
    },
    [save],
  );

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next;
      latest.current = v;
      setValue(v);
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        save();
      }, 400);
    },
    [save],
  );

  return [value, update, loaded];
}
