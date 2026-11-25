"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNow } from "@/lib/hooks";
import { useOS } from "./os-context";

/** Detects an edge swipe (vertical, long enough). Calls onSwipe with the vertical distance. */
export function useSwipe(onSwipe: (dy: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx) * 1.4) onSwipe(dy);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

type BatteryManager = {
  level: number;
  charging: boolean;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
};

function useBattery() {
  const [bat, setBat] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let mounted = true;
    let bm: BatteryManager | null = null;
    const update = () => {
      if (bm && mounted) setBat({ level: bm.level, charging: bm.charging });
    };
    nav
      .getBattery()
      .then((b) => {
        bm = b;
        update();
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      bm?.removeEventListener("levelchange", update);
      bm?.removeEventListener("chargingchange", update);
    };
  }, []);
  return bat;
}

export function StatusBar() {
  const os = useOS();
  const now = useNow(1000);
  const bat = useBattery();
  const sw = useSwipe((dy) => {
    if (dy > 0 && !os.locked) os.setOverlay("shade");
  });
  const level = bat?.level ?? 0.85;

  return (
    <div
      {...sw}
      className="status-h touch-none absolute inset-x-0 top-0 z-[80] flex items-center justify-between px-6 text-[13px] font-semibold text-white drop-shadow-md"
    >
      <span className="tabular-nums">{now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
      <span className="flex items-center gap-2">
        <span className={`text-[10px] font-bold ${os.online ? "text-emerald-300" : "text-rose-300"}`}>PC</span>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
          <rect x="13.5" y="0" width="2.5" height="11" rx="0.8" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 24 18" fill="currentColor" aria-hidden>
          <path d="M12 16.5l2.6-2.9a3.7 3.7 0 0 0-5.2 0L12 16.5zM6.1 10.6l1.8 2a6.2 6.2 0 0 1 8.2 0l1.8-2a8.9 8.9 0 0 0-11.8 0zM1.5 6l1.8 2a11.5 11.5 0 0 1 17.4 0l1.8-2a14 14 0 0 0-21 0z" />
        </svg>
        <span className="flex items-center gap-0.5" title={`Battery ${Math.round(level * 100)}%`}>
          <span className="relative h-[11px] w-[22px] rounded-[3px] border border-current p-[1.5px]">
            <span
              className={`block h-full rounded-[1px] ${level < 0.2 ? "bg-rose-400" : "bg-current"}`}
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </span>
          <span className="h-[5px] w-[2px] rounded-r bg-current opacity-80" />
        </span>
      </span>
    </div>
  );
}

export function NavBar() {
  const os = useOS();
  const sw = useSwipe((dy) => {
    if (dy < 0 && !os.overlay) {
      if (os.activeId) os.goHome();
      else os.setOverlay("drawer");
    }
  });
  const btn = "grid h-10 w-16 place-items-center rounded-full text-white transition active:bg-white/20";

  return (
    <div
      {...sw}
      className="nav-h touch-none absolute inset-x-0 bottom-0 z-[80] flex items-center justify-around px-8"
    >
      <button aria-label="Back" onClick={os.back} className={btn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button aria-label="Home" onClick={os.goHome} className={btn}>
        <span className="h-4 w-4 rounded-full border-2 border-white" />
      </button>
      <button
        aria-label="Recent apps"
        onClick={() => os.setOverlay(os.overlay === "recents" ? null : "recents")}
        className={btn}
      >
        <span className="h-3.5 w-3.5 rounded-[3px] border-2 border-white" />
      </button>
    </div>
  );
}
