"use client";

import { useOS } from "@/components/phone/os-context";
import { useEffect, useState } from "react";
import { MB, WALLPAPERS } from "@/lib/catalog";
import { api, fmtBytes, fmtMb, fmtUptime } from "@/lib/client";
import { AppShell, Bar, btn, btnDanger, btnGhost, input, Row, Section, Toggle } from "./ui";

function SecuritySection({ notify }: { notify: (n: { title: string; body: string; icon: string }) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ enabled: boolean }>("/api/auth/pin").then((d) => setEnabled(d.enabled)).catch(() => {});
  }, []);
  const run = async (action: "set" | "remove") => {
    setBusy(true);
    try {
      const d = await api<{ enabled: boolean }>("/api/auth/pin", { method: "POST", json: { action, pin, current } });
      setEnabled(d.enabled);
      setPin("");
      setCurrent("");
      notify({ title: d.enabled ? "PIN lock on" : "PIN lock off", body: d.enabled ? "Your phone now asks for the PIN." : "Anyone on your Wi-Fi can connect.", icon: "🔒" });
    } catch (e) {
      notify({ title: "PIN not changed", body: (e as Error).message, icon: "⚠️" });
    }
    setBusy(false);
  };
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);
  return (
    <Section title="Security">
      <Row label="PIN lock" value={enabled === null ? "…" : enabled ? "On" : "Off"} />
      {enabled && (
        <input className={input} type="password" inputMode="numeric" placeholder="Current PIN" value={current} onChange={(e) => setCurrent(digits(e.target.value))} />
      )}
      <input className={input} type="password" inputMode="numeric" placeholder={enabled ? "New PIN (4-8 digits)" : "Set a PIN (4-8 digits)"} value={pin} onChange={(e) => setPin(digits(e.target.value))} />
      <div className="flex gap-2">
        <button className={btn} disabled={busy || pin.length < 4} onClick={() => void run("set")}>{enabled ? "Change PIN" : "Turn on"}</button>
        {enabled && <button className={btnDanger} disabled={busy || current.length < 4} onClick={() => void run("remove")}>Turn off</button>}
      </div>
    </Section>
  );
}

const PRESETS_MB = [2048, 5120, 10240, 25600, 51200];

export default function SettingsApp() {
  const os = useOS();
  const { settings, setSettings, storage, refreshStorage, online, latency, lock, catalog, installed, notify } = os;

  const sys = storage?.system;
  const diskTotal = storage?.disk?.totalBytes ?? 0;
  const diskFree = storage?.disk?.freeBytes ?? 0;
  const diskUsed = Math.max(0, diskTotal - diskFree);
  const usedBytes = storage?.usedBytes ?? 0;
  const appsBytes = (storage?.appsMb ?? 0) * MB;
  const filesBytes = storage?.filesBytes ?? 0;
  const quotaBytes = settings.quotaMb * MB;
  const maxMb = diskTotal ? Math.max(2048, Math.floor(diskTotal / MB)) : 102400;
  const installedNames = catalog.filter((a) => installed.includes(a.id));

  const setQuota = (mb: number) => {
    setSettings({ quotaMb: mb });
    notify({ title: "Storage limit updated", body: `Phone can use up to ${fmtMb(mb)} on your PC.`, icon: "💾" });
  };

  return (
    <AppShell
      title="Settings"
      right={
        <button className={btnGhost} onClick={() => void refreshStorage()} aria-label="Refresh">
          ↻
        </button>
      }
    >
      <div className="space-y-4 p-4">
        <Section title="Profile">
          <input
            className={input}
            value={settings.ownerName}
            maxLength={30}
            placeholder="Your name"
            onChange={(e) => setSettings({ ownerName: e.target.value })}
          />
        </Section>

        <Section title="PC Connection">
          <Row label="Status" value={online === null ? "Checking…" : online ? "Connected" : "Offline"} />
          <Row label="Latency" value={latency !== null ? `${latency} ms` : "—"} />
          <Row label="Address" value={typeof window !== "undefined" ? window.location.host : "—"} />
          <Row label="PC name" value={sys?.hostname ?? "—"} />
          <Row label="System" value={sys ? `${sys.platform} · ${sys.arch}` : "—"} />
          <Row label="CPU" value={sys ? `${sys.cpuModel.slice(0, 26)} (${sys.cpuCount})` : "—"} />
          <Row label="Memory used" value={sys ? `${fmtBytes(sys.totalMem - sys.freeMem)} / ${fmtBytes(sys.totalMem)}` : "—"} />
          <Row label="PC uptime" value={sys ? fmtUptime(sys.uptime) : "—"} />
          <Row label="Server uptime" value={sys ? fmtUptime(sys.serverUptime) : "—"} />
          {typeof window !== "undefined" && "Capacitor" in window && (
            <button className={btnGhost} onClick={() => (window.location.href = "http://localhost/?change=1")}>
              Change PC / scan QR
            </button>
          )}
        </Section>

        <SecuritySection notify={notify} />

        <Section title="Storage on PC">
          {storage?.disk ? (
            <>
              <div className="flex justify-between text-sm">
                <span>PC disk</span>
                <span className="font-medium">
                  {fmtBytes(diskFree)} free of {fmtBytes(diskTotal)}
                </span>
              </div>
              <Bar pct={(diskUsed / diskTotal) * 100} className="bg-slate-500" />
            </>
          ) : (
            <p className="text-xs text-slate-500">Disk info unavailable on this PC.</p>
          )}

          <div className="flex justify-between pt-2 text-sm">
            <span>Phone storage used</span>
            <span className="font-medium">
              {fmtBytes(usedBytes)} / {fmtMb(settings.quotaMb)}
            </span>
          </div>
          <Bar pct={(usedBytes / quotaBytes) * 100} />
          <Row label="Apps" value={fmtBytes(appsBytes)} />
          <Row label="Files" value={fmtBytes(filesBytes)} />
          <Row label="Free for phone" value={fmtBytes(Math.max(0, quotaBytes - usedBytes))} />

          <div className="pt-2">
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">Storage limit</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS_MB.map((mb) => (
                <button
                  key={mb}
                  onClick={() => setQuota(mb)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    settings.quotaMb === mb ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  {fmtMb(mb)}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1024}
              max={maxMb}
              step={512}
              value={Math.min(settings.quotaMb, maxMb)}
              onChange={(e) => setSettings({ quotaMb: Number(e.target.value) })}
              className="mt-3 w-full accent-blue-500"
              aria-label="Storage limit"
            />
          </div>
        </Section>

        <Section title="Apps">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {installedNames.length} installed · {installedNames.map((a) => a.icon).join(" ")}
          </p>
          <p className="text-xs text-slate-500">Open the App Store to download or remove apps.</p>
        </Section>

        <Section title="Display & Sound">
          <div className="flex items-center justify-between">
            <span className="text-sm">Dark mode</span>
            <Toggle label="Dark mode" on={settings.darkMode} onChange={(v) => setSettings({ darkMode: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Sound effects</span>
            <Toggle label="Sound" on={settings.sound} onChange={(v) => setSettings({ sound: v })} />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Brightness</span>
              <span className="opacity-70">{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={settings.brightness}
              onChange={(e) => setSettings({ brightness: Number(e.target.value) })}
              className="w-full accent-amber-500"
              aria-label="Brightness"
            />
          </div>
          <div>
            <div className="mb-2 text-sm">Wallpaper</div>
            <div className="grid grid-cols-6 gap-2">
              {WALLPAPERS.map((w, i) => (
                <button
                  key={w.name}
                  aria-label={w.name}
                  title={w.name}
                  onClick={() => setSettings({ wallpaper: i })}
                  className={`h-12 rounded-xl ring-2 ${settings.wallpaper === i ? "ring-blue-500" : "ring-transparent"}`}
                  style={{ background: w.css }}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title="Phone">
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={lock}>
              🔒 Lock phone
            </button>
            <button className={btnGhost} onClick={() => os.closeAll()}>
              Close all apps
            </button>
            <button className={btnGhost} onClick={() => os.notify({ title: "Hello!", body: "Notifications are working.", icon: "👋" })}>
              Test notification
            </button>
          </div>
        </Section>

        <Section title="About">
          <p className="text-sm">Home PC Phone · v1.0</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Apps and files are stored on your PC. Open this address on your phone (same Wi-Fi), then choose
            &quot;Add to Home screen&quot; to install it like an app.
          </p>
          <button
            className={btnDanger}
            onClick={() => {
              if (window.confirm("Close every app and lock the phone?")) {
                os.closeAll();
                lock();
              }
            }}
          >
            Reset session
          </button>
        </Section>
      </div>
    </AppShell>
  );
}
