"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useOS } from "@/components/phone/os-context";
import { tone } from "@/lib/audio";
import { useAppState } from "@/lib/hooks";
import { btn, btnGhost } from "./ui";

const N = 20; // grid size
const CELL = 20; // pixels per cell on the canvas
type P = { x: number; y: number };
type Status = "ready" | "playing" | "paused" | "over";

function randomFood(snake: P[]): P {
  let p: P;
  do {
    p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

function initialGame() {
  const snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  return { snake, dir: { x: 1, y: 0 } as P, next: { x: 1, y: 0 } as P, food: randomFood(snake), score: 0 };
}

export default function SnakeApp() {
  const { activeId, settings } = useOS();
  const active = activeId === "snake";
  const [best, setBest] = useAppState<number>("snake", "best", 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef(initialGame());
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const g = game.current;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(148,163,184,0.08)";
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, c.height);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(c.width, i * CELL);
      ctx.stroke();
    }
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#bef264" : "#22c55e";
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();
    });
  }, []);

  const tick = useCallback(() => {
    const g = game.current;
    g.dir = g.next;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
    const hitSelf = g.snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      setStatus("over");
      if (settings.sound) tone(180, 0.35, "sawtooth", 0.12);
      setBest((b) => Math.max(b, g.score));
      return;
    }
    g.snake.unshift(head);
    if (head.x === g.food.x && head.y === g.food.y) {
      g.score += 1;
      g.food = randomFood(g.snake);
      setScore(g.score);
      if (settings.sound) tone(740, 0.08, "square", 0.08);
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw, setBest, settings.sound]);

  // Game loop: gets faster as the score grows.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(tick, Math.max(65, 140 - score * 3));
    return () => clearInterval(id);
  }, [status, score, tick]);

  // Redraw whenever the state changes while not ticking.
  useEffect(() => {
    draw();
  }, [status, draw]);

  // Pause automatically when the app leaves the foreground.
  useEffect(() => {
    if (!active && status === "playing") setStatus("paused");
  }, [active, status]);

  const start = () => {
    if (status === "playing") return;
    if (status !== "paused") {
      game.current = initialGame();
      setScore(0);
    }
    setStatus("playing");
  };
  const togglePause = () => {
    if (status === "playing") setStatus("paused");
    else start();
  };

  const turn = (d: P) => {
    const g = game.current;
    if (d.x === -g.dir.x && d.y === -g.dir.y) return; // no instant reversal
    g.next = d;
  };

  // Keyboard controls while visible.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, P> = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      };
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
        return;
      }
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        turn(d);
        if (status === "ready" || status === "over") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onSwipeDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onSwipeUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    else turn(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  };

  const dpad = (label: string, d: P, cls: string) => (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        turn(d);
        if (status === "ready" || status === "over") start();
      }}
      className={`grid h-14 w-14 place-items-center rounded-2xl bg-slate-200 text-xl active:scale-95 dark:bg-slate-800 ${cls}`}
    >
      {label === "Up" ? "▲" : label === "Down" ? "▼" : label === "Left" ? "◀" : "▶"}
    </button>
  );

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-[360px] items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Score</div>
          <div className="text-2xl font-bold tabular-nums">{score}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Best (saved)</div>
          <div className="text-2xl font-bold tabular-nums">{best}</div>
        </div>
      </div>

      <div className="relative w-full max-w-[360px]">
        <canvas
          ref={canvasRef}
          width={N * CELL}
          height={N * CELL}
          onPointerDown={onSwipeDown}
          onPointerUp={onSwipeUp}
          className="touch-none aspect-square w-full rounded-2xl shadow-xl ring-1 ring-slate-300 dark:ring-slate-700"
          aria-label="Snake board"
        />
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-slate-900/60 text-center text-white backdrop-blur-[2px]">
            <div className="space-y-3">
              <p className="text-lg font-semibold">
                {status === "over" ? `Game over · ${score}` : status === "paused" ? "Paused" : "Snake"}
              </p>
              <button className={btn} onClick={status === "over" ? () => { game.current = initialGame(); setScore(0); setStatus("playing"); } : start}>
                {status === "over" ? "Play again" : status === "paused" ? "Resume" : "Start"}
              </button>
              {status === "ready" && <p className="text-xs text-white/70">Swipe or use arrow keys</p>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div />
        {dpad("Up", { x: 0, y: -1 }, "")}
        <div />
        {dpad("Left", { x: -1, y: 0 }, "")}
        <button onClick={togglePause} className={`${btnGhost} grid h-14 w-14 place-items-center`} aria-label="Pause">
          {status === "playing" ? "❚❚" : "▶"}
        </button>
        {dpad("Right", { x: 1, y: 0 }, "")}
        <div />
        {dpad("Down", { x: 0, y: 1 }, "")}
        <div />
      </div>
    </div>
  );
}
