import QRCode from "qrcode";
import os from "node:os";
import { tunnelEnabled, tunnelUrl } from "@/lib/tunnel";

export const dynamic = "force-dynamic";

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  const rank = (a: string) => (a.startsWith("192.168.") ? 0 : a.startsWith("10.") ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

export default async function Connect() {
  const port = process.env.PORT ?? "3000";
  const urls = lanAddresses().map((a) => `http://${a}:${port}`);
  const qrs = await Promise.all(urls.map((u) => QRCode.toString(u, { type: "svg", margin: 1, width: 260 })));
  const away = tunnelUrl();
  const awayQr = away ? await QRCode.toString(away, { type: "svg", margin: 1, width: 260 }) : null;
  const waiting = tunnelEnabled() && !away;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold">📱 Connect your phone</h1>
        <p className="mt-1 text-sm text-slate-400">Open the PC Phone app, tap &quot;Scan QR&quot;, and point it here.</p>
        {urls.length === 0 && <p className="mt-8 text-amber-300">No network found. Connect this PC to Wi-Fi first.</p>}
        {urls.map((u, i) => (
          <div key={u} className="mt-6">
            <div className="mx-auto inline-block rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            <div className="mt-2 font-mono text-lg">{u}</div>
            {urls.length > 1 && i === 0 && <div className="text-xs text-slate-500">Most likely your home Wi-Fi</div>}
          </div>
        ))}
        {waiting && (
          <div className="mt-10 text-sm text-slate-400">
            <meta httpEquiv="refresh" content="4" />
            ⏳ Setting up away-from-home access…
          </div>
        )}
        {away && awayQr && (
          <div className="mt-10 border-t border-slate-800 pt-8">
            <h2 className="text-lg font-semibold">🌍 Away from home</h2>
            <p className="mt-1 text-sm text-slate-400">Scan this one too, once. Needs a PIN (Settings &gt; Security).</p>
            <div className="mx-auto mt-4 inline-block rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: awayQr }} />
            <div className="mt-2 break-all font-mono text-sm">{away}</div>
            <div className="text-xs text-slate-500">This address changes each time the PC app restarts.</div>
          </div>
        )}
        <p className="mt-8 text-xs text-slate-500">Phone and PC must be on the same Wi-Fi. Keep this PC running.</p>
      </div>
    </main>
  );
}
