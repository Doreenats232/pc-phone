"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { tone } from "@/lib/audio";
import { useNow } from "@/lib/hooks";
import { AppShell, btn, btnGhost, card } from "./ui";

const CITIES: { name: string; tz?: string }[] = [
  { name: "Local time" },
  { name: "New York", tz: "America/New_York" },
  { name: "London", tz: "Europe/London" },
  { name: "Dubai", tz: "Asia/Dubai" },
  { name: "Tokyo", tz: "Asia/Tokyo" },
  { name: "Sydney", tz: "Australia/Sydney" },
];

type Tab = "world" | "timer" | "stopwatch";

export default function ClockApp() {
  const [tab, setTab] = useState<Tab>("world");
  const tabs: [Tab, string][] = [
    ["world", "🌍 World"],
    ["timer", "⏳ Timer"],
    ["stopwatch", "⏱ Stopwatch"],
  ];
  return (
    <AppShell title="Clock">
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1 dark:bg-slate-800">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-xl py-2 text-sm font-medium ${
                tab === id ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "world" && <World />}
        {tab === "timer" && <Timer />}
        {tab === "stopwatch" && <Stopwatch />}
      </div>
    </AppShell>
  );
}

function World() {
  const now = useNow(1000);
  return (
    <div className="space-y-3">
      {CITIES.map((c) => (
        <div key={c.name} className={`${card} flex items-center justify-between`}>
          <div>
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {now ? now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", timeZone: c.tz }) : ""}
            </div>
          </div>
          <div className="text-3xl font-light tabular-nums">
            {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: c.tz }) : "--:--"}
          </div>
        </div>
      ))}
    </div>
  );
}

function Timer() {
  const { settings, notify } = useOS();
  const [total, setTotal] = useState(300);
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      if (settings.sound) [0, 0.35, 0.7].forEach((t) => tone(880, 0.25, "square", 0.12, t));
      notify({ title: "Timer finished", body: "Time's up!", icon: "⏰" });
    }
  }, [left, running, settings.sound, notify]);

  const set = (s: number) => {
    setTotal(s);
    setLeft(s);
    setRunning(false);
  };
  const pct = total ? (left / total) * 100 : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid h-56 w-56 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} strokeWidth="8" className="fill-none stroke-slate-200 dark:stroke-slate-800" />
          <circle
            cx="60"
            cy="60"
            r={r}
            strokeWidth="8"
            strokeLinecap="round"
            className="fill-none stroke-blue-500 transition-[stroke-dashoffset]"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
          />
        </svg>
        <div className="text-5xl font-light tabular-nums">
          {mm}:{ss}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {[60, 180, 300, 600, 900].map((s) => (
          <button key={s} onClick={() => set(s)} className={`${btnGhost} ${total === s ? "ring-2 ring-blue-500" : ""}`}>
            {s / 60}m
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button className={btn} disabled={left === 0} onClick={() => setRunning((r2) => !r2)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className={btnGhost} onClick={() => set(total)}>
          Reset
        </button>
      </div>
    </div>
  );
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const baseRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(baseRef.current + Date.now() - startRef.current), 50);
    return () => {
      clearInterval(id);
      baseRef.current += Date.now() - startRef.current;
      setElapsed(baseRef.current);
    };
  }, [running]);

  const fmt = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const c = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
  };

  const reset = () => {
    setRunning(false);
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="py-6 text-5xl font-light tabular-nums">{fmt(elapsed)}</div>
      <div className="flex gap-3">
        <button className={btn} onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : elapsed > 0 ? "Resume" : "Start"}
        </button>
        {running ? (
          <button className={btnGhost} onClick={() => setLaps((l) => [elapsed, ...l])}>
            Lap
          </button>
        ) : (
          <button className={btnGhost} onClick={reset}>
            Reset
          </button>
        )}
      </div>
      <div className="w-full space-y-2">
        {laps.map((l, i) => (
          <div key={i} className={`${card} flex justify-between text-sm tabular-nums`}>
            <span>Lap {laps.length - i}</span>
            <span>{fmt(l)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
