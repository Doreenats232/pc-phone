"use client";

import { useRef, useState } from "react";
import { useNow } from "@/lib/hooks";
import { useOS } from "./os-context";

export function LockScreen() {
  const os = useOS();
  const now = useNow(1000);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  const end = () => {
    startY.current = null;
    setDrag(0);
  };

  return (
    <div
      className="anim-fade absolute inset-0 z-[70] flex touch-none flex-col items-center bg-black/25 px-6 text-white backdrop-blur-xl"
      onPointerDown={(e) => {
        startY.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (startY.current !== null) setDrag(Math.min(0, e.clientY - startY.current));
      }}
      onPointerUp={(e) => {
        if (startY.current !== null && e.clientY - startY.current < -110) os.unlock();
        end();
      }}
      onPointerCancel={end}
    >
      <div className="mt-24 text-center drop-shadow">
        <p className="text-base font-medium opacity-90">
          {now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
        </p>
        <p className="text-[84px] font-extralight leading-none tabular-nums">
          {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : " "}
        </p>
      </div>

      <div
        className="mt-auto mb-24 flex flex-col items-center gap-4"
        style={{ transform: `translateY(${drag}px)`, opacity: 1 + drag / 300 }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-2xl ring-1 ring-white/30">🔒</div>
        <p className="animate-bounce text-sm opacity-90">Swipe up to unlock</p>
        <button onClick={os.unlock} className="rounded-full bg-white/20 px-5 py-2 text-sm font-medium ring-1 ring-white/30">
          Unlock
        </button>
      </div>

      <p className="absolute bottom-7 text-xs opacity-70">
        {os.online ? `PC connected · ${os.latency ?? "–"} ms` : "PC offline"}
      </p>
    </div>
  );
}

export function BootScreen() {
  const os = useOS();
  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white">
      <div
        className="grid h-24 w-24 place-items-center rounded-[2rem] text-5xl shadow-2xl"
        style={{ background: "linear-gradient(145deg,#6366f1,#06b6d4)" }}
      >
        📱
      </div>
      <h1 className="mt-5 text-xl font-semibold">Home PC Phone</h1>
      <p className="mt-1 text-xs text-white/60">{os.online ? "Connected to your PC" : "Connecting to your PC…"}</p>
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/15">
        <div className="anim-boot h-full bg-white" />
      </div>
    </div>
  );
}
