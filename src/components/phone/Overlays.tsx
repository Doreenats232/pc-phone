"use client";

import { useState } from "react";
import { WALLPAPERS } from "@/lib/catalog";
import { useSwipe } from "./Bars";
import { AppIcon } from "./HomeScreen";
import { useOS } from "./os-context";

export function Overlays() {
  const os = useOS();
  return (
    <>
      {os.banner && os.overlay !== "shade" && <Banner />}
      {os.overlay === "drawer" && <Drawer />}
      {os.overlay === "recents" && <Recents />}
      {os.overlay === "shade" && <Shade />}
    </>
  );
}

function Banner() {
  const os = useOS();
  const n = os.banner;
  if (!n) return null;
  return (
    <button
      type="button"
      onClick={() => {
        os.dismissBanner();
        os.setOverlay("shade");
      }}
      className="anim-banner absolute left-3 right-3 z-[85] flex items-start gap-3 rounded-2xl bg-white/90 p-3 text-left text-slate-900 shadow-2xl backdrop-blur-xl dark:bg-slate-800/95 dark:text-white"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 2.6rem)" }}
    >
      <span className="text-xl">{n.icon ?? "🔔"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{n.title}</span>
        {n.body && <span className="block truncate text-xs opacity-75">{n.body}</span>}
      </span>
    </button>
  );
}

function Drawer() {
  const os = useOS();
  const [q, setQ] = useState("");
  const apps = os.catalog.filter((a) => os.isInstalled(a.id) && a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div
      className="anim-fade absolute inset-0 z-40 bg-black/70 backdrop-blur-2xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) os.setOverlay(null);
      }}
    >
      <div className="win-area absolute inset-x-0 flex flex-col px-5 pt-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps"
          className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm text-white outline-none ring-1 ring-white/20 placeholder:text-white/60"
        />
        <div className="no-scrollbar mt-5 grid flex-1 grid-cols-4 content-start gap-x-3 gap-y-5 overflow-y-auto pb-6">
          {apps.map((a) => (
            <AppIcon key={a.id} app={a} onOpen={() => os.openApp(a.id)} />
          ))}
          {apps.length === 0 && <p className="col-span-4 py-10 text-center text-sm text-white/70">No apps match.</p>}
        </div>
      </div>
    </div>
  );
}

function Recents() {
  const os = useOS();
  const cards = [...os.openApps].reverse();
  return (
    <div className="anim-fade absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-2xl">
      <div className="win-area absolute inset-x-0 flex flex-col px-4 pt-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recents</h2>
          {cards.length > 0 && (
            <button onClick={os.closeAll} className="rounded-full bg-white/15 px-3 py-1 text-sm">
              Close all
            </button>
          )}
        </div>
        {cards.length === 0 ? (
          <p className="mt-24 text-center text-white/70">No recent apps. Open an app to see it here.</p>
        ) : (
          <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            {cards.map((id) => {
              const app = os.catalog.find((a) => a.id === id);
              if (!app) return null;
              return (
                <div
                  key={id}
                  className="flex h-[62vh] w-[72%] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20"
                >
                  <div className="flex items-center justify-between bg-white/10 px-3 py-2 text-sm">
                    <span className="truncate">
                      {app.icon} {app.name}
                    </span>
                    <button
                      aria-label={`Close ${app.name}`}
                      onClick={() => os.closeApp(id)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/20"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => os.openApp(id)}
                    className="grid flex-1 place-items-center"
                    style={{ background: `linear-gradient(145deg, ${app.colors[0]}, ${app.colors[1]})` }}
                  >
                    <span className="text-8xl drop-shadow-lg">{app.icon}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Shade() {
  const os = useOS();
  const sw = useSwipe((dy) => {
    if (dy < 0) os.setOverlay(null);
  });
  const { settings, setSettings, notices, clearNotices } = os;
  const tile = (on: boolean) =>
    `flex flex-col items-start gap-0.5 rounded-2xl p-3 text-left text-sm transition active:scale-95 ${
      on ? "bg-blue-500 text-white" : "bg-white/15 text-white"
    }`;

  return (
    <div
      className="anim-fade absolute inset-0 z-[60] bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) os.setOverlay(null);
      }}
    >
      <div
        {...sw}
        className="anim-slide-down absolute inset-x-0 top-0 max-h-[90%] overflow-y-auto rounded-b-[2rem] bg-slate-900/85 px-4 pb-6 text-white shadow-2xl backdrop-blur-2xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className={tile(!!os.online)}>
            <span className="font-medium">📶 Home PC</span>
            <span className="text-xs opacity-80">{os.online ? `Connected · ${os.latency ?? "–"} ms` : "Offline"}</span>
          </div>
          <button className={tile(settings.darkMode)} onClick={() => setSettings({ darkMode: !settings.darkMode })}>
            <span className="font-medium">🌙 Dark mode</span>
            <span className="text-xs opacity-80">{settings.darkMode ? "On" : "Off"}</span>
          </button>
          <button className={tile(settings.sound)} onClick={() => setSettings({ sound: !settings.sound })}>
            <span className="font-medium">🔔 Sound</span>
            <span className="text-xs opacity-80">{settings.sound ? "On" : "Muted"}</span>
          </button>
          <button className={tile(false)} onClick={os.lock}>
            <span className="font-medium">🔒 Lock</span>
            <span className="text-xs opacity-80">Lock screen</span>
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-white/15 p-3">
          <div className="flex justify-between text-sm">
            <span>☀️ Brightness</span>
            <span className="opacity-80">{settings.brightness}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            value={settings.brightness}
            onChange={(e) => setSettings({ brightness: Number(e.target.value) })}
            className="mt-2 w-full accent-blue-400"
            aria-label="Brightness"
          />
        </div>

        <div className="mt-3 rounded-2xl bg-white/15 p-3">
          <div className="text-sm">🎨 Wallpaper</div>
          <div className="mt-2 flex gap-2">
            {WALLPAPERS.map((w, i) => (
              <button
                key={w.name}
                aria-label={w.name}
                onClick={() => setSettings({ wallpaper: i })}
                className={`h-9 flex-1 rounded-xl ring-2 ${settings.wallpaper === i ? "ring-white" : "ring-transparent"}`}
                style={{ background: w.css }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {notices.length > 0 && (
            <button onClick={clearNotices} className="text-xs text-blue-300">
              Clear all
            </button>
          )}
        </div>
        <div className="mt-2 space-y-2">
          {notices.length === 0 && <p className="text-sm text-white/60">No notifications</p>}
          {notices.map((n) => (
            <div key={n.id} className="flex gap-3 rounded-2xl bg-white/10 p-3">
              <span className="text-xl">{n.icon ?? "🔔"}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-white/70">{n.body}</div>}
                <div className="mt-0.5 text-[10px] text-white/50">{new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={() => os.setOverlay(null)} className="h-1.5 w-16 rounded-full bg-white/40" aria-label="Close panel" />
        </div>
      </div>
    </div>
  );
}
