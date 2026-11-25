"use client";

import type { ComponentType } from "react";
import SettingsApp from "./Settings";
import StoreApp from "./Store";
import FilesApp from "./Files";
import NotesApp from "./Notes";
import CalculatorApp from "./Calculator";
import ClockApp from "./Clock";
import TodoApp from "./Todo";
import BrowserApp from "./Browser";
import PaintApp from "./Paint";
import PianoApp from "./Piano";
import SnakeApp from "./Snake";
import Game2048App from "./Game2048";

// Maps an app id from the catalog to its UI.
const REGISTRY: Record<string, ComponentType> = {
  settings: SettingsApp,
  store: StoreApp,
  files: FilesApp,
  notes: NotesApp,
  calculator: CalculatorApp,
  clock: ClockApp,
  todo: TodoApp,
  browser: BrowserApp,
  paint: PaintApp,
  piano: PianoApp,
  snake: SnakeApp,
  "2048": Game2048App,
};

export function AppView({ id }: { id: string }) {
  const C = REGISTRY[id];
  if (!C) return <div className="p-6 text-sm">This app is unavailable.</div>;
  return <C />;
}
