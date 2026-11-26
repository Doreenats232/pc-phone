"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { api, fmtBytes } from "@/lib/client";
import { uploadMedia, type MediaItem } from "@/lib/media-client";
import { AppShell, btn, btnDanger, btnGhost } from "./ui";

export default function GalleryApp() {
  const { notify, refreshStorage } = useOS();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pick = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await api<{ items: MediaItem[] }>("/api/media");
    setItems(d.items);
  }, []);
  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  const addFromPhone = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      setBusy(`Moving to PC… ${i + 1}/${list.length}`);
      try {
        await uploadMedia(list[i]);
        ok++;
      } catch (e) {
        notify({ title: "Skipped a file", body: (e as Error).message, icon: "⚠️" });
      }
    }
    setBusy(null);
    notify({ title: `${ok} saved to your PC`, body: "You can now delete them from your phone's own gallery to free space.", icon: "🖼️" });
    await Promise.all([load(), refreshStorage()]);
  };

  const remove = async (it: MediaItem) => {
    if (!window.confirm("Delete this from your PC? This can't be undone.")) return;
    await api(`/api/media/${it.name}`, { method: "DELETE" }).catch(() => {});
    setView(null);
    await Promise.all([load(), refreshStorage()]);
  };

  const cur = view !== null && items ? items[view] : null;

  if (cur && view !== null && items) {
    return (
      <AppShell
        title={`${view + 1} of ${items.length}`}
        right={
          <>
            <button className={btnDanger} onClick={() => void remove(cur)}>Delete</button>
            <button className={btnGhost} onClick={() => setView(null)}>Close</button>
          </>
        }
      >
        <div className="flex h-full min-h-[70vh] flex-col bg-black">
          <div className="grid flex-1 place-items-center">
            {cur.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={cur.name} src={`/api/media/${cur.name}`} alt="" className="max-h-[70vh] max-w-full object-contain" />
            ) : (
              <video key={cur.name} src={`/api/media/${cur.name}`} controls playsInline className="max-h-[70vh] max-w-full" />
            )}
          </div>
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-xs text-slate-300">
            <button disabled={view === 0} className={btnGhost} onClick={() => setView(view - 1)}>◀</button>
            <span>{new Date(cur.mtime).toLocaleString()} · {fmtBytes(cur.size)}</span>
            <button disabled={view >= items.length - 1} className={btnGhost} onClick={() => setView(view + 1)}>▶</button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Gallery"
      right={
        <>
          <input ref={pick} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void addFromPhone(e.target.files); e.target.value = ""; }} />
          <button className={btn} disabled={!!busy} onClick={() => pick.current?.click()}>⬆ Add from phone</button>
        </>
      }
    >
      {busy && <p className="bg-emerald-600 px-4 py-2 text-center text-sm text-white">{busy}</p>}
      {items === null && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}
      {items?.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-500">
          <div className="text-5xl">🖼️</div>
          <p className="mt-3">No photos yet. Take one with Camera, or tap &quot;Add from phone&quot; to move your existing photos onto your PC.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-0.5">
        {items?.map((it, i) => (
          <button key={it.name} onClick={() => setView(i)} className="relative aspect-square overflow-hidden bg-slate-200 dark:bg-slate-800">
            {it.hasThumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${it.name}?thumb=1`} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-3xl">{it.kind === "video" ? "🎬" : "🖼️"}</div>
            )}
            {it.kind === "video" && <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">▶</span>}
          </button>
        ))}
      </div>
    </AppShell>
  );
}
