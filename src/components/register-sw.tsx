"use client";

import { useEffect } from "react";

// The phone stores nothing: remove any old service worker + caches.
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((r) => r.forEach((x) => x.unregister())).catch(() => {});
    }
    if ("caches" in window) caches.keys().then((k) => k.forEach((x) => caches.delete(x))).catch(() => {});
  }, []);
  return null;
}
