"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { api } from "@/lib/client";
import { AppShell, btn, btnGhost } from "./ui";

// A website running as an app. Sites that forbid embedding open in the phone's browser instead.
export default function WebApp({ id }: { id: string }) {
  const { catalog } = useOS();
  const app = catalog.find((a) => a.id === id);
  const [state, setState] = useState<"checking" | "frame" | "blocked">("checking");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!app?.url) return;
    api<{ embeddable: boolean }>(`/api/webapps/check?url=${encodeURIComponent(app.url)}`)
      .then((d) => setState(d.embeddable ? "frame" : "blocked"))
      .catch(() => setState("frame"));
  }, [app?.url]);

  if (!app?.url) return <div className="p-6 text-sm">This app is unavailable.</div>;
  const openOutside = () => window.open(app.url, "_blank", "noopener");

  return (
    <AppShell
      title={app.name}
      right={
        <>
          <button className={btnGhost} onClick={() => setNonce((n) => n + 1)} aria-label="Reload">↻</button>
          <button className={btnGhost} onClick={openOutside} aria-label="Open in browser">↗</button>
        </>
      }
    >
      {state === "checking" && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}
      {state === "blocked" && (
        <div className="grid place-items-center gap-3 p-8 text-center">
          <div className="text-5xl">🚫</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {app.name} doesn&apos;t allow itself to be shown inside another app.
          </p>
          <button className={btn} onClick={openOutside}>Open in browser</button>
        </div>
      )}
      {state === "frame" && (
        <iframe
          key={nonce}
          src={app.url}
          title={app.name}
          className="block h-full min-h-[70vh] w-full border-0 bg-white"
          allow="fullscreen; clipboard-write; autoplay"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </AppShell>
  );
}
