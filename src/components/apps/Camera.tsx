"use client";

import { useRef, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { uploadMedia } from "@/lib/media-client";
import { AppShell, btnGhost } from "./ui";

type Shot = { name: string; kind: "image" | "video" };

// Uses the phone's camera, but the file goes straight to the PC (nothing is kept on the phone by this app).
export default function CameraApp() {
  const { openApp, notify, refreshStorage } = useOS();
  const [front, setFront] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handle = async (files: FileList | null, reset: () => void) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const s = await uploadMedia(f);
        setShots((p) => [s, ...p]);
      }
      notify({ title: "Saved to your PC", body: "Open Gallery to see it.", icon: "📷" });
      void refreshStorage();
    } catch (e) {
      notify({ title: "Couldn't save", body: (e as Error).message, icon: "⚠️" });
    }
    reset();
    setBusy(false);
  };

  const capture = front ? "user" : "environment";

  return (
    <AppShell title="Camera">
      <div className="space-y-4 p-4">
        <input ref={photoRef} type="file" accept="image/*" capture={capture} hidden onChange={(e) => void handle(e.target.files, () => (e.target.value = ""))} />
        <input ref={videoRef} type="file" accept="video/*" capture={capture} hidden onChange={(e) => void handle(e.target.files, () => (e.target.value = ""))} />

        <div className="grid place-items-center rounded-3xl bg-slate-900 py-10 text-center text-white">
          <div className="text-6xl">📷</div>
          <p className="mt-2 text-sm text-slate-300">Photos and videos save to your PC.</p>
          <div className="mt-5 flex gap-3">
            <button disabled={busy} onClick={() => photoRef.current?.click()} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 active:scale-95 disabled:opacity-50">
              Take photo
            </button>
            <button disabled={busy} onClick={() => videoRef.current?.click()} className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50">
              Record video
            </button>
          </div>
          <button onClick={() => setFront((v) => !v)} className="mt-4 text-xs text-slate-400 underline">
            Using {front ? "front" : "back"} camera · switch
          </button>
          {busy && <p className="mt-3 text-sm text-emerald-300">Saving to PC…</p>}
        </div>

        {shots.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Just saved</span>
              <button className={btnGhost} onClick={() => openApp("gallery")}>Open Gallery</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {shots.map((s) => (
                <div key={s.name} className="aspect-square overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                  {s.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${s.name}?thumb=1`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-2xl">🎬</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
