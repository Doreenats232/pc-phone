"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useOS } from "@/components/phone/os-context";
import { tone } from "@/lib/audio";
import { useAppState } from "@/lib/hooks";
import { btn, btnGhost } from "./ui";

type Saved = { board: number[]; score: number; over: boolean };
type Dir = 0 | 1 | 2 | 3; // left, right, up, down

function addRandom(b: number[]): number[] {
  const empties = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (empties.length === 0) return b;
  const i = empties[Math.floor(Math.random() * empties.length)];
  const nb = [...b];
  nb[i] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function newSaved(): Saved {
  return { board: addRandom(addRandom(new Array(16).fill(0))), score: 0, over: false };
}

function slideLine(line: number[]): { line: number[]; gained: number } {
  const vals = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const v = vals[i] * 2;
      out.push(v);
      gained += v;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained };
}

function move(board: number[], dir: Dir): { board: number[]; gained: number; moved: boolean } {
  const out = [...board];
  let gained = 0;
  for (let k = 0; k < 4; k++) {
    const idx: number[] = [];
    for (let j = 0; j < 4; j++) {
      if (dir === 0) idx.push(k * 4 + j);
      else if (dir === 1) idx.push(k * 4 + (3 - j));
      else if (dir === 2) idx.push(j * 4 + k);
      else idx.push((3 - j) * 4 + k);
    }
    const r = slideLine(idx.map((i) => board[i]));
    gained += r.gained;
    idx.forEach((ix, j) => {
      out[ix] = r.line[j];
    });
  }
  return { board: out, gained, moved: out.some((v, i) => v !== board[i]) };
}

const canMove = (b: number[]) => ([0, 1, 2, 3] as Dir[]).some((d) => move(b, d).moved);

const TILE: Record<number, string> = {
  0: "bg-slate-300/70 dark:bg-slate-800",
  2: "bg-amber-100 text-slate-800",
  4: "bg-amber-200 text-slate-800",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-yellow-600 text-white",
  1024: "bg-amber-500 text-white",
  2048: "bg-amber-400 text-white",
};

export default function Game2048App() {
  const { activeId, settings, notify } = useOS();
  const active = activeId === "2048";
  const [game, setGame, loaded] = useAppState<Saved>("2048", "game", newSaved());
  const [best, setBest] = useAppState<number>("2048", "best", 0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const doMove = (d: Dir) => {
    if (!loaded || game.over) return;
    const r = move(game.board, d);
    if (!r.moved) return;
    const nb = addRandom(r.board);
    const score = game.score + r.gained;
    const over = !canMove(nb);
    setGame({ board: nb, score, over });
    if (score > best) setBest(score);
    if (settings.sound) tone(r.gained ? 560 : 320, 0.06, "triangle", 0.06);
    if (over) notify({ title: "Game over", body: `Final score ${score}`, icon: "🔢" });
  };

  const newGame = () => setGame(newSaved());

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 };
      const d = map[e.key];
      if (d !== undefined) {
        e.preventDefault();
        doMove(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 0);
    else doMove(dy > 0 ? 3 : 2);
  };

  const board = loaded ? game.board : new Array(16).fill(0);

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto bg-amber-50 p-4 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-[360px] items-center justify-between">
        <h2 className="text-4xl font-black text-amber-600">2048</h2>
        <div className="flex gap-2">
          <div className="rounded-xl bg-amber-200/70 px-3 py-1 text-center dark:bg-slate-800">
            <div className="text-[10px] uppercase text-amber-800 dark:text-slate-400">Score</div>
            <div className="font-bold tabular-nums">{loaded ? game.score : 0}</div>
          </div>
          <div className="rounded-xl bg-amber-200/70 px-3 py-1 text-center dark:bg-slate-800">
            <div className="text-[10px] uppercase text-amber-800 dark:text-slate-400">Best</div>
            <div className="font-bold tabular-nums">{best}</div>
          </div>
        </div>
      </div>

      <div
        onPointerDown={onDown}
        onPointerUp={onUp}
        className="touch-none relative aspect-square w-full max-w-[360px] rounded-2xl bg-slate-400/40 p-2.5 shadow-xl dark:bg-slate-900"
      >
        <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2.5">
          {board.map((v, i) => (
            <div
              key={i}
              className={`grid place-items-center rounded-xl font-extrabold shadow-inner transition-colors duration-150 ${TILE[v] ?? "bg-fuchsia-600 text-white"} ${
                v >= 1024 ? "text-lg" : v >= 128 ? "text-xl" : "text-3xl"
              }`}
            >
              {v || ""}
            </div>
          ))}
        </div>
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-slate-900/40 text-sm text-white">
            Loading your game…
          </div>
        )}
        {loaded && game.over && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-slate-900/60 text-center text-white">
            <div className="space-y-3">
              <p className="text-xl font-bold">Game over</p>
              <button className={btn} onClick={newGame}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[360px] items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">Swipe or use arrow keys. Your game saves to the PC.</p>
        <button className={btnGhost} onClick={newGame}>
          New game
        </button>
      </div>
    </div>
  );
}
