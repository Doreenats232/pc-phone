"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { tone } from "@/lib/audio";

type Op = "+" | "-" | "×" | "÷";

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function fmt(n: number): string {
  if (!isFinite(n)) return "Error";
  const s = String(Number(n.toPrecision(12)));
  return s.length > 14 ? n.toExponential(6) : s;
}

export default function CalculatorApp() {
  const { activeId, settings } = useOS();
  const active = activeId === "calculator";
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [expr, setExpr] = useState("");

  const click = (sound = true) => {
    if (sound && settings.sound) tone(1200, 0.03, "triangle", 0.04);
  };

  const digit = (d: string) => {
    click();
    setDisplay((p) => (fresh ? d : p === "0" ? d : p.length < 14 ? p + d : p));
    setFresh(false);
  };

  const dot = () => {
    click();
    if (fresh) {
      setDisplay("0.");
      setFresh(false);
    } else if (!display.includes(".")) setDisplay(display + ".");
  };

  const pressOp = (o: Op) => {
    click();
    const cur = parseFloat(display);
    if (prev !== null && op && !fresh) {
      const r = compute(prev, cur, op);
      setPrev(r);
      setDisplay(fmt(r));
      setExpr(`${fmt(r)} ${o}`);
    } else {
      setPrev(cur);
      setExpr(`${display} ${o}`);
    }
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (op === null || prev === null) return;
    click();
    const r = compute(prev, parseFloat(display), op);
    setExpr(`${fmt(prev)} ${op} ${display} =`);
    setDisplay(fmt(r));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    click();
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
    setExpr("");
  };

  const sign = () => setDisplay((p) => (p === "0" || p === "Error" ? p : p.startsWith("-") ? p.slice(1) : "-" + p));
  const percent = () => setDisplay((p) => fmt(parseFloat(p) / 100));
  const backspace = () => {
    if (fresh) return;
    setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
  };

  // Keyboard support (only while this app is in the foreground).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) digit(e.key);
      else if (e.key === ".") dot();
      else if (e.key === "+" || e.key === "-") pressOp(e.key as Op);
      else if (e.key === "*") pressOp("×");
      else if (e.key === "/") {
        e.preventDefault();
        pressOp("÷");
      } else if (e.key === "Enter" || e.key === "=") equals();
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape" || e.key === "Delete") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys: { label: string; kind: "fn" | "num" | "op"; action: () => void; span?: boolean }[] = [
    { label: fresh || display === "0" ? "AC" : "C", kind: "fn", action: clear },
    { label: "±", kind: "fn", action: sign },
    { label: "%", kind: "fn", action: percent },
    { label: "÷", kind: "op", action: () => pressOp("÷") },
    { label: "7", kind: "num", action: () => digit("7") },
    { label: "8", kind: "num", action: () => digit("8") },
    { label: "9", kind: "num", action: () => digit("9") },
    { label: "×", kind: "op", action: () => pressOp("×") },
    { label: "4", kind: "num", action: () => digit("4") },
    { label: "5", kind: "num", action: () => digit("5") },
    { label: "6", kind: "num", action: () => digit("6") },
    { label: "-", kind: "op", action: () => pressOp("-") },
    { label: "1", kind: "num", action: () => digit("1") },
    { label: "2", kind: "num", action: () => digit("2") },
    { label: "3", kind: "num", action: () => digit("3") },
    { label: "+", kind: "op", action: () => pressOp("+") },
    { label: "0", kind: "num", action: () => digit("0"), span: true },
    { label: ".", kind: "num", action: dot },
    { label: "=", kind: "op", action: equals },
  ];

  const styles = {
    fn: "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white",
    num: "bg-white text-slate-900 dark:bg-slate-800 dark:text-white",
    op: "bg-orange-500 text-white",
  };
  const activeOp = (label: string) => op === label && fresh && prev !== null;

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="flex flex-1 flex-col justify-end px-6 pb-4 pt-10">
        <div className="min-h-5 truncate text-right text-sm text-slate-400">{expr}</div>
        <div className="truncate text-right text-6xl font-light tabular-nums" aria-live="polite">
          {display}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 p-4 pb-6">
        {keys.map((k) => (
          <button
            key={k.label + k.kind}
            onClick={k.action}
            className={`${
              k.span ? "col-span-2 h-[72px] items-center justify-start rounded-full pl-8" : "aspect-square w-full max-w-[72px] justify-self-center rounded-full"
            } ${
              k.kind === "op" && activeOp(k.label) ? "bg-white text-orange-500" : styles[k.kind]
            } flex items-center justify-center text-2xl font-medium transition active:brightness-125`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
