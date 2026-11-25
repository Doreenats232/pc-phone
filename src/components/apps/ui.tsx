"use client";

import type { ReactNode } from "react";

export function AppShell({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${className}`}>
      {title && (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="truncate text-lg font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-2">{right}</div>
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export const btn =
  "rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50";
export const btnGhost =
  "rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition active:scale-95 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100";
export const btnDanger =
  "rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50";
export const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
export const card = "rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${card} space-y-3`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Bar({ pct, className = "bg-blue-500" }: { pct: number; className?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
