"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useOS } from "@/components/phone/os-context";
import { tone } from "@/lib/audio";
import { AppShell, btnGhost } from "./ui";

const WAVES: OscillatorType[] = ["triangle", "sine", "square", "sawtooth"];
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const WHITE_COUNT = 15; // two octaves plus a final C
const START = 60; // C4

// Computer keyboard: a-k plays C4..C5 (w/e/t/y/u are the black keys).
const KEYMAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
};

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export default function PianoApp() {
  const { activeId } = useOS();
  const active = activeId === "piano";
  const [wave, setWave] = useState<OscillatorType>("triangle");
  const [pressed, setPressed] = useState<number[]>([]);

  const whites = useMemo(
    () => Array.from({ length: WHITE_COUNT }, (_, i) => START + Math.floor(i / 7) * 12 + WHITE_OFFSETS[i % 7]),
    [],
  );
  const blacks = useMemo(() => {
    const out: { midi: number; index: number }[] = [];
    whites.forEach((m, i) => {
      if ([0, 1, 3, 4, 5].includes(i % 7) && i < WHITE_COUNT - 1) out.push({ midi: m + 1, index: i });
    });
    return out;
  }, [whites]);

  const press = (midi: number) => {
    tone(freq(midi), 1.4, wave, 0.22);
    setPressed((p) => (p.includes(midi) ? p : [...p, midi]));
  };
  const release = (midi: number) => setPressed((p) => p.filter((m) => m !== midi));

  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      const m = KEYMAP[e.key.toLowerCase()];
      if (m === undefined || e.repeat) return;
      press(m);
    };
    const up = (e: KeyboardEvent) => {
      const m = KEYMAP[e.key.toLowerCase()];
      if (m !== undefined) release(m);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const keyDown = (m: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    press(m);
  };

  const w = 100 / WHITE_COUNT;

  return (
    <AppShell
      title="Piano"
      right={
        <select
          value={wave}
          onChange={(e) => setWave(e.target.value as OscillatorType)}
          className="rounded-xl bg-slate-200 px-2 py-2 text-sm dark:bg-slate-800"
          aria-label="Sound type"
        >
          {WAVES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      }
    >
      <div className="flex h-full flex-col gap-4 bg-slate-900 p-4 text-white">
        <p className="text-center text-xs text-white/60">Tap or glide across the keys. Keyboard: A–K, black keys W E T Y U.</p>
        <div className="relative mt-auto h-64 w-full touch-none select-none overflow-hidden rounded-2xl bg-slate-800 p-1 shadow-inner">
          <div className="relative flex h-full">
            {whites.map((m, i) => (
              <div
                key={m}
                onPointerDown={keyDown(m)}
                onPointerUp={() => release(m)}
                onPointerLeave={() => release(m)}
                onPointerEnter={(e) => {
                  if (e.buttons === 1) press(m);
                }}
                className={`h-full flex-1 rounded-b-lg border border-slate-300 transition-colors ${
                  pressed.includes(m) ? "bg-blue-200" : "bg-white"
                }`}
                style={{ marginLeft: i === 0 ? 0 : -0.5 }}
                aria-label={`Key ${m}`}
              />
            ))}
          </div>
          {blacks.map((b) => (
            <div
              key={b.midi}
              onPointerDown={keyDown(b.midi)}
              onPointerUp={() => release(b.midi)}
              onPointerLeave={() => release(b.midi)}
              onPointerEnter={(e) => {
                if (e.buttons === 1) press(b.midi);
              }}
              className={`absolute top-1 z-10 h-[60%] rounded-b-md shadow-lg transition-colors ${
                pressed.includes(b.midi) ? "bg-blue-500" : "bg-slate-900"
              }`}
              style={{
                left: `calc(${(b.index + 1) * w}% - ${w * 0.32}%)`,
                width: `${w * 0.64}%`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-center gap-2 text-xs text-white/70">
          <span>Octave</span>
          <button className={btnGhost} onClick={() => setPressed([])}>
            Stop all
          </button>
        </div>
      </div>
    </AppShell>
  );
}
