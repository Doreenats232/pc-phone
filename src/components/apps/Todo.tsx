"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/lib/hooks";
import { uid } from "@/lib/client";
import { AppShell, btnGhost, input } from "./ui";

type Item = { id: string; text: string; done: boolean };
type Filter = "all" | "active" | "done";

export default function TodoApp() {
  const [items, setItems, loaded] = useAppState<Item[]>("todo", "items", []);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((prev) => [{ id: uid(), text: t, done: false }, ...prev]);
    setText("");
  };

  const toggle = (id: string) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearDone = () => setItems((prev) => prev.filter((i) => !i.done));

  const visible = useMemo(
    () => items.filter((i) => (filter === "all" ? true : filter === "active" ? !i.done : i.done)),
    [items, filter],
  );
  const left = items.filter((i) => !i.done).length;

  return (
    <AppShell
      title="To-Do"
      right={
        items.some((i) => i.done) ? (
          <button className={btnGhost} onClick={clearDone}>
            Clear done
          </button>
        ) : null
      }
    >
      <div className="space-y-4 p-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className={input} placeholder="Add a task…" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white active:scale-95">
            Add
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{left} left</span>
          <div className="flex gap-1 rounded-full bg-slate-200 p-1 dark:bg-slate-800">
            {(["all", "active", "done"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 capitalize ${filter === f ? "bg-white text-slate-900 shadow dark:bg-slate-600 dark:text-white" : ""}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!loaded && <p className="py-8 text-center text-sm text-slate-500">Loading from your PC…</p>}
        {loaded && visible.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">{items.length === 0 ? "No tasks yet. Add one above!" : "Nothing here."}</p>
        )}

        <ul className="space-y-2">
          {visible.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <button
                onClick={() => toggle(i.id)}
                aria-label={i.done ? "Mark as not done" : "Mark as done"}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs ${
                  i.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {i.done ? "✓" : ""}
              </button>
              <span className={`min-w-0 flex-1 break-words text-sm ${i.done ? "text-slate-400 line-through" : ""}`}>{i.text}</span>
              <button onClick={() => remove(i.id)} aria-label="Delete task" className="text-slate-400 active:text-rose-500">
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
