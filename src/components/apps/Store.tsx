"use client";

import { useMemo, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { MB, type AppCategory } from "@/lib/catalog";
import { fmtBytes } from "@/lib/client";
import { AppShell } from "./ui";

type Tab = "For you" | "Top charts" | "Categories" | "Installed";
const TABS: Tab[] = ["For you", "Top charts", "Categories", "Installed"];
const CATEGORIES: AppCategory[] = ["Productivity", "Media", "Games", "Internet", "Tools", "System"];

export default function StoreApp() {
  const { catalog, isInstalled, installApp, uninstallApp, addWebApp, notify, openApp, storage, settings } = useOS();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("For you");
  const [cat, setCat] = useState<AppCategory | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const quotaBytes = settings.quotaMb * MB;
  const usedBytes = storage?.usedBytes ?? 0;
  const freeBytes = quotaBytes - usedBytes;

  const list = useMemo(() => {
    let l = catalog.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (cat) l = l.filter((a) => a.category === cat);
    if (tab === "Top charts") l = [...l].sort((a, b) => b.rating - a.rating);
    if (tab === "Installed") l = l.filter((a) => isInstalled(a.id));
    return l;
  }, [catalog, q, tab, cat, isInstalled]);

  const download = (id: string) => {
    const app = catalog.find((a) => a.id === id);
    if (!app) return;
    if (app.sizeMb * MB > freeBytes) {
      notify({ title: "Not enough storage", body: `${app.name} needs ${app.sizeMb} MB on your PC.`, icon: "⚠️" });
      return;
    }
    const duration = Math.min(4500, 900 + app.sizeMb * 70);
    const start = Date.now();
    setProgress((p) => ({ ...p, [id]: 0.01 }));
    const timer = setInterval(() => {
      const pct = Math.min(1, (Date.now() - start) / duration);
      if (pct < 1) return setProgress((p) => ({ ...p, [id]: pct }));
      clearInterval(timer);
      installApp(id)
        .then(() => notify({ title: `${app.name} installed`, body: "Find it on your home screen.", icon: app.icon }))
        .catch((e: Error) => notify({ title: "Install failed", body: e.message, icon: "⚠️" }))
        .finally(() => setProgress((p) => { const n = { ...p }; delete n[id]; return n; }));
    }, 100);
  };

  const addSite = async () => {
    setAddBusy(true);
    try {
      const a = await addWebApp(siteUrl, siteName || undefined);
      notify({ title: `${a.name} added`, body: "Find it on your home screen.", icon: "🌐" });
      setAdding(false);
      setSiteUrl("");
      setSiteName("");
      openApp(a.id);
    } catch (e) {
      notify({ title: "Couldn't add website", body: (e as Error).message, icon: "⚠️" });
    }
    setAddBusy(false);
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Uninstall ${name}? Its saved data will be deleted.`)) return;
    try {
      await uninstallApp(id);
      notify({ title: `${name} uninstalled`, body: "Storage freed on your PC.", icon: "🗑️" });
    } catch (e) {
      notify({ title: "Couldn't uninstall", body: (e as Error).message, icon: "⚠️" });
    }
  };

  const Action = ({ id, big }: { id: string; big?: boolean }) => {
    const app = catalog.find((a) => a.id === id)!;
    const p = progress[id];
    const base = `rounded-full px-4 text-sm font-medium transition active:scale-95 ${big ? "py-2.5 flex-1" : "py-1.5"}`;
    if (p !== undefined)
      return (
        <div className={big ? "flex-1" : "w-24"}>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-600" style={{ width: `${p * 100}%` }} /></div>
          <div className="mt-1 text-center text-[11px] text-slate-500">Installing… {Math.round(p * 100)}%</div>
        </div>
      );
    if (isInstalled(id))
      return (
        <div className={`flex gap-2 ${big ? "flex-1" : ""}`}>
          {!app.core && !big && null}
          <button className={`${base} bg-emerald-600 text-white`} onClick={() => openApp(id)}>Open</button>
          {!app.core && <button className={`${base} border border-slate-300 text-slate-700`} onClick={() => remove(id, app.name)}>Uninstall</button>}
        </div>
      );
    return <button className={`${base} border border-emerald-600 text-emerald-700`} onClick={() => download(id)}>Install</button>;
  };

  const Icon = ({ id, size = 56 }: { id: string; size?: number }) => {
    const a = catalog.find((x) => x.id === id)!;
    return (
      <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-[22%] shadow-sm" style={{ width: size, height: size, fontSize: size * 0.5, background: `linear-gradient(145deg, ${a.colors[0]}, ${a.colors[1]})` }}>
        {a.icon}
        {a.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.iconUrl} alt="" className="absolute rounded-md bg-white object-contain p-0.5" style={{ width: size * 0.64, height: size * 0.64 }} onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
      </div>
    );
  };

  const open = detail ? catalog.find((a) => a.id === detail) : null;

  if (open)
    return (
      <AppShell className="!bg-white !text-slate-900">
        <div className="p-4">
          <button className="mb-3 text-sm text-slate-600" onClick={() => setDetail(null)}>← Back</button>
          <div className="flex gap-4">
            <Icon id={open.id} size={76} />
            <div className="min-w-0">
              <h2 className="text-xl font-medium">{open.name}</h2>
              <p className="text-sm text-emerald-700">{open.category}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-around text-center text-xs text-slate-500">
            <div><div className="text-sm font-medium text-slate-800">{open.rating ? `${open.rating} ★` : "Web"}</div>{open.rating ? "Rating" : "Website"}</div>
            <div><div className="text-sm font-medium text-slate-800">{open.sizeMb} MB</div>On your PC</div>
            <div><div className="text-sm font-medium text-slate-800">{open.core ? "System" : "Free"}</div>Type</div>
          </div>
          <div className="mt-5 flex"><Action id={open.id} big /></div>
          <h3 className="mt-6 font-medium">About this app</h3>
          <p className="mt-1 text-sm text-slate-600">{open.description}</p>
        </div>
      </AppShell>
    );

  return (
    <AppShell className="!bg-white !text-slate-900">
      <div className="sticky top-0 z-10 bg-white px-4 pb-1 pt-3">
        <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2.5">
          <span className="text-slate-500">🔍</span>
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search apps" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => setAdding((v) => !v)} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white" aria-label="Add website">＋ Website</button>
        </div>
        {adding && (
          <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Add any website as an app on your home screen.</p>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" placeholder="youtube.com" inputMode="url" autoCapitalize="off" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" placeholder="Name (optional)" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            <button disabled={addBusy || !siteUrl.trim()} onClick={() => void addSite()} className="w-full rounded-full bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50">Add to phone</button>
          </div>
        )}
        <div className="no-scrollbar mt-2 flex gap-5 overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); setCat(null); }} className={`shrink-0 border-b-2 pb-2 text-sm ${tab === t ? "border-emerald-600 font-medium text-emerald-700" : "border-transparent text-slate-500"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1 px-4 pb-6">
        {tab === "Categories" && !cat && (
          <div className="grid grid-cols-2 gap-2 pt-3">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className="rounded-xl bg-slate-100 py-4 text-sm font-medium text-slate-700">{c}</button>
            ))}
          </div>
        )}
        {cat && <button className="pt-3 text-sm text-emerald-700" onClick={() => setCat(null)}>← {cat}</button>}

        {!(tab === "Categories" && !cat) &&
          list.map((a, i) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetail(a.id)}>
                {tab === "Top charts" && <span className="w-4 text-sm text-slate-400">{i + 1}</span>}
                <Icon id={a.id} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="truncate text-xs text-slate-500">{a.category} · {a.sizeMb} MB</div>
                  <div className="text-xs text-slate-500">{a.rating ? `${a.rating} ★` : "Web app"}</div>
                </div>
              </button>
              <Action id={a.id} />
            </div>
          ))}
        {!(tab === "Categories" && !cat) && list.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No apps found.</p>}

        <p className="pt-4 text-center text-[11px] text-slate-400">
          PC storage: {fmtBytes(usedBytes)} of {fmtBytes(quotaBytes)} used. Apps install on your PC, not your phone.
        </p>
      </div>
    </AppShell>
  );
}
