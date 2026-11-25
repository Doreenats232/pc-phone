"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useOS } from "@/components/phone/os-context";
import { api } from "@/lib/client";
import { AppShell, btn, btnGhost } from "./ui";

const COLORS = ["#0f172a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];
const SIZES = [3, 8, 18];
const W = 600;
const H = 800;
const MAX_UNDO = 12;

export default function PaintApp() {
  const { notify, refreshStorage } = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [erase, setErase] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const snapshot = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    history.current.push(ctx.getImageData(0, 0, W, H));
    if (history.current.length > MAX_UNDO) history.current.shift();
    setCanUndo(true);
  };

  const strokeStyle = () => (erase ? "#ffffff" : color);

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    drawing.current = true;
    const p = pos(e);
    last.current = p;
    ctx.fillStyle = strokeStyle();
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = strokeStyle();
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    const ctx = canvasRef.current?.getContext("2d");
    const img = history.current.pop();
    if (!ctx || !img) return;
    ctx.putImageData(img, 0, 0);
    setCanUndo(history.current.length > 0);
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  };

  const save = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setSaving(true);
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      await api("/api/files", {
        method: "POST",
        json: { folder: "/Pictures", name: `Drawing ${stamp}.png`, mimeType: "image/png", content: c.toDataURL("image/png") },
      });
      notify({ title: "Drawing saved", body: "Stored in Pictures on your PC.", icon: "🎨" });
      void refreshStorage();
    } catch (e) {
      notify({ title: "Save failed", body: (e as Error).message, icon: "⚠️" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Paint"
      right={
        <>
          <button className={btnGhost} onClick={undo} disabled={!canUndo}>
            ↶ Undo
          </button>
          <button className={btn} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="touch-none w-full rounded-xl bg-white shadow-lg ring-1 ring-slate-300"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Drawing canvas"
        />

        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              onClick={() => {
                setColor(c);
                setErase(false);
              }}
              className={`h-7 w-7 rounded-full border border-slate-300 ${color === c && !erase ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              aria-label={`Brush ${s}`}
              onClick={() => setSize(s)}
              className={`grid h-10 w-10 place-items-center rounded-xl bg-slate-200 dark:bg-slate-800 ${size === s ? "ring-2 ring-blue-500" : ""}`}
            >
              <span className="rounded-full bg-current" style={{ width: s, height: s }} />
            </button>
          ))}
          <button onClick={() => setErase((e) => !e)} className={`${erase ? btn : btnGhost}`}>
            ⌫ Eraser
          </button>
          <button onClick={clear} className={btnGhost}>
            Clear
          </button>
        </div>
      </div>
    </AppShell>
  );
}
