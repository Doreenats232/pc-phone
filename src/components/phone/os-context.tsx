"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CATALOG, DEFAULT_SETTINGS, type AppDef, type StorageInfo, type SystemSettings } from "@/lib/catalog";
import { api } from "@/lib/client";
import { useAppState } from "@/lib/hooks";

export type Notice = { id: number; title: string; body?: string; icon?: string; time: number };
export type Overlay = "drawer" | "recents" | "shade" | null;

export type OS = {
  catalog: AppDef[];
  installed: string[];
  isInstalled: (id: string) => boolean;
  installApp: (id: string) => Promise<void>;
  uninstallApp: (id: string) => Promise<void>;
  addWebApp: (url: string, name?: string) => Promise<AppDef>;
  settings: SystemSettings;
  setSettings: (patch: Partial<SystemSettings>) => void;
  storage: StorageInfo | null;
  refreshStorage: () => Promise<void>;
  online: boolean | null;
  latency: number | null;
  notices: Notice[];
  banner: Notice | null;
  notify: (n: { title: string; body?: string; icon?: string }) => void;
  clearNotices: () => void;
  dismissBanner: () => void;
  openApps: string[];
  activeId: string | null;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  openApp: (id: string) => void;
  closeApp: (id: string) => void;
  closeAll: () => void;
  goHome: () => void;
  back: () => void;
  locked: boolean;
  lock: () => void;
  unlock: () => void;
  booted: boolean;
};

const OSContext = createContext<OS | null>(null);

export function useOS(): OS {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used inside <OSProvider>");
  return ctx;
}

export function OSProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState<string[]>([]);
  const [settingsRaw, setSettingsRaw] = useAppState<Partial<SystemSettings>>("system", "settings", {});
  const settings: SystemSettings = { ...DEFAULT_SETTINGS, ...settingsRaw };

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [catalog, setCatalog] = useState<AppDef[]>(CATALOG);
  const [banner, setBanner] = useState<Notice | null>(null);
  const [openApps, setOpenApps] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [locked, setLocked] = useState(true);
  const [booted, setBooted] = useState(false);

  const seq = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshApps = useCallback(async () => {
    const d = await api<{ catalog: AppDef[]; installed: { appId: string }[] }>("/api/apps");
    setCatalog(d.catalog);
    setInstalled(d.installed.map((i) => i.appId));
  }, []);

  const refreshStorage = useCallback(async () => {
    try {
      setStorage(await api<StorageInfo>("/api/storage"));
    } catch {
      /* PC unreachable: keep last value */
    }
  }, []);

  const ping = useCallback(async () => {
    const t0 = performance.now();
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      setOnline(r.ok);
      setLatency(r.ok ? Math.round(performance.now() - t0) : null);
    } catch {
      setOnline(false);
      setLatency(null);
    }
  }, []);

  useEffect(() => {
    refreshApps().catch(() => {});
    void refreshStorage();
    void ping();
    const p = setInterval(() => void ping(), 15000);
    const s = setInterval(() => void refreshStorage(), 30000);
    const b = setTimeout(() => setBooted(true), 1800);
    return () => {
      clearInterval(p);
      clearInterval(s);
      clearTimeout(b);
    };
  }, [refreshApps, refreshStorage, ping]);

  const notify = useCallback((n: { title: string; body?: string; icon?: string }) => {
    seq.current += 1;
    const item: Notice = { id: seq.current, title: n.title, body: n.body, icon: n.icon, time: Date.now() };
    setNotices((prev) => [item, ...prev].slice(0, 30));
    setBanner(item);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3800);
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);
  const clearNotices = useCallback(() => setNotices([]), []);

  const isInstalled = useCallback((id: string) => installed.includes(id), [installed]);

  const installApp = useCallback(
    async (id: string) => {
      await api(`/api/apps/${id}`, { method: "POST" });
      await Promise.all([refreshApps(), refreshStorage()]);
    },
    [refreshApps, refreshStorage],
  );

  const uninstallApp = useCallback(
    async (id: string) => {
      await api(`/api/apps/${id}`, { method: "DELETE" });
      setOpenApps((p) => p.filter((x) => x !== id));
      setActiveId((a) => (a === id ? null : a));
      await Promise.all([refreshApps(), refreshStorage()]);
    },
    [refreshApps, refreshStorage],
  );

  const addWebApp = useCallback(
    async (url: string, name?: string) => {
      const d = await api<{ app: AppDef }>("/api/webapps", { method: "POST", json: { url, name } });
      await Promise.all([refreshApps(), refreshStorage()]);
      return d.app;
    },
    [refreshApps, refreshStorage],
  );

  const setSettings = useCallback(
    (patch: Partial<SystemSettings>) => setSettingsRaw((prev) => ({ ...prev, ...patch })),
    [setSettingsRaw],
  );

  const openApp = useCallback(
    (id: string) => {
      if (!installed.includes(id)) {
        notify({ title: "Not installed", body: "Download this app from the App Store first.", icon: "🛍️" });
        return;
      }
      setOpenApps((p) => [...p.filter((x) => x !== id), id].slice(-8));
      setActiveId(id);
      setOverlay(null);
    },
    [installed, notify],
  );

  const closeApp = useCallback((id: string) => {
    setOpenApps((p) => p.filter((x) => x !== id));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const closeAll = useCallback(() => {
    setOpenApps([]);
    setActiveId(null);
    setOverlay(null);
  }, []);

  const goHome = useCallback(() => {
    setActiveId(null);
    setOverlay(null);
  }, []);

  const back = useCallback(() => {
    if (overlay) setOverlay(null);
    else if (activeId) setActiveId(null);
  }, [overlay, activeId]);

  const lock = useCallback(() => {
    setOverlay(null);
    setLocked(true);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  const value: OS = {
    catalog,
    addWebApp,
    installed,
    isInstalled,
    installApp,
    uninstallApp,
    settings,
    setSettings,
    storage,
    refreshStorage,
    online,
    latency,
    notices,
    banner,
    notify,
    clearNotices,
    dismissBanner,
    openApps,
    activeId,
    overlay,
    setOverlay,
    openApp,
    closeApp,
    closeAll,
    goHome,
    back,
    locked,
    lock,
    unlock,
    booted,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}
