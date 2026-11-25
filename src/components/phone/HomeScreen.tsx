"use client";

import type { AppDef } from "@/lib/catalog";
import { DOCK_IDS, MB } from "@/lib/catalog";
import { fmtBytes, fmtMb } from "@/lib/client";
import { useNow } from "@/lib/hooks";
import { useOS } from "./os-context";

export function AppIcon({ app, onOpen, small }: { app: AppDef; onOpen: () => void; small?: boolean }) {
  const size = small ? "h-[54px] w-[54px] text-[26px]" : "h-[60px] w-[60px] text-[30px]";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col items-center gap-1.5 transition-transform touch-manipulation active:scale-90"
      aria-label={app.name}
    >
      <span
        className={`grid ${size} place-items-center rounded-[1.1rem] shadow-lg shadow-black/30 ring-1 ring-white/20`}
        style={{ background: `linear-gradient(145deg, ${app.colors[0]}, ${app.colors[1]})` }}
      >
        {app.icon}
      </span>
      {!small && <span className="w-full truncate text-center text-[11px] font-medium text-white drop-shadow">{app.name}</span>}
    </button>
  );
}

export function HomeScreen() {
  const os = useOS();
  const now = useNow(1000);
  const apps = os.catalog.filter((a) => os.isInstalled(a.id));
  const dock = DOCK_IDS.map((id) => os.catalog.find((a) => a.id === id)).filter(
    (a): a is AppDef => !!a && os.isInstalled(a.id),
  );
  const usedBytes = os.storage?.usedBytes ?? 0;
  const quotaBytes = os.settings.quotaMb * MB;
  const pct = Math.min(100, quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0);

  return (
    <div className="absolute inset-0 z-0">
      <div className="win-area absolute inset-x-0 overflow-y-auto no-scrollbar px-5 pb-36 pt-4 text-white">
        <div className="drop-shadow">
          <p className="text-sm font-medium opacity-90">
            {now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
          </p>
          <p className="text-[64px] font-light leading-none tracking-tight tabular-nums">
            {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : " "}
          </p>
          <p className="mt-1 text-sm opacity-90">Hi, {os.settings.ownerName}</p>
        </div>

        <button
          type="button"
          onClick={() => os.openApp("settings")}
          className="mt-6 w-full rounded-[1.6rem] bg-white/20 p-4 text-left ring-1 ring-white/25 backdrop-blur-xl transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-sm font-medium">
            <span>💾 PC Storage</span>
            <span>
              {fmtBytes(usedBytes)} / {fmtMb(os.settings.quotaMb)}
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs opacity-90">
            <span className={`h-2 w-2 rounded-full ${os.online ? "bg-emerald-300" : "bg-rose-400"}`} />
            {os.online === null
              ? "Checking your PC…"
              : os.online
                ? `Connected to your PC · ${os.latency ?? "–"} ms`
                : "PC offline — start the server on your PC"}
          </div>
        </button>

        <div className="mt-7 grid grid-cols-4 gap-x-3 gap-y-6">
          {apps.map((a) => (
            <AppIcon key={a.id} app={a} onOpen={() => os.openApp(a.id)} />
          ))}
        </div>
        {apps.length === 0 && <p className="mt-10 text-center text-sm opacity-80">No apps installed. Open the App Store.</p>}
      </div>

      <div className="dock-pos absolute inset-x-3 flex items-center justify-around rounded-[1.8rem] bg-white/20 px-3 py-2.5 ring-1 ring-white/25 backdrop-blur-2xl">
        {dock.map((a) => (
          <AppIcon key={a.id} app={a} small onOpen={() => os.openApp(a.id)} />
        ))}
        <button
          type="button"
          onClick={() => os.setOverlay("drawer")}
          aria-label="All apps"
          className="grid h-[54px] w-[54px] place-items-center rounded-[1.1rem] bg-white/25 text-2xl text-white transition active:scale-90"
        >
          ⊞
        </button>
      </div>
    </div>
  );
}
