"use client";

import { useState } from "react";

export default function Unlock() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (r?.ok) location.replace("/");
    else {
      setMsg(d?.error ?? "Can't reach PC");
      setPin("");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-xs text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-2 text-xl font-semibold">Enter PIN</h1>
        <p className="mb-5 text-sm text-slate-400">This phone is locked on your PC.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && go()}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-blue-500"
        />
        <button
          disabled={busy || pin.length < 4}
          onClick={go}
          className="mt-3 w-full rounded-xl bg-blue-600 py-3 font-semibold disabled:opacity-50"
        >
          Unlock
        </button>
        <p className="mt-3 min-h-5 text-sm text-rose-400">{msg}</p>
      </div>
    </main>
  );
}
