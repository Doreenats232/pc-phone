// Shared catalog + settings types (safe to import from both client and server code).

export const MB = 1024 * 1024;

export type AppCategory = "System" | "Productivity" | "Media" | "Games" | "Internet" | "Tools";

export type AppDef = {
  id: string;
  name: string;
  icon: string;
  colors: [string, string];
  description: string;
  category: AppCategory;
  sizeMb: number;
  rating: number;
  core: boolean; // system apps can never be removed
  preinstalled: boolean; // installed on first boot
};

export const CATALOG: AppDef[] = [
  { id: "settings", name: "Settings", icon: "⚙️", colors: ["#94a3b8", "#334155"], description: "Storage, display, PC connection and system options.", category: "System", sizeMb: 2, rating: 4.9, core: true, preinstalled: true },
  { id: "files", name: "Files", icon: "📁", colors: ["#60a5fa", "#1d4ed8"], description: "Browse, upload, preview and manage files stored on your PC.", category: "System", sizeMb: 3, rating: 4.8, core: true, preinstalled: true },
  { id: "store", name: "Play Store", icon: "▶️", colors: ["#34d399", "#047857"], description: "Get apps. They live on your PC, not on your phone.", category: "System", sizeMb: 2, rating: 4.7, core: true, preinstalled: true },
  { id: "notes", name: "Notes", icon: "📝", colors: ["#fde68a", "#f59e0b"], description: "Quick notes autosaved to the Notes folder on your PC.", category: "Productivity", sizeMb: 4, rating: 4.7, core: false, preinstalled: true },
  { id: "calculator", name: "Calculator", icon: "🧮", colors: ["#fdba74", "#ea580c"], description: "Clean calculator with keyboard support.", category: "Tools", sizeMb: 1, rating: 4.6, core: false, preinstalled: true },
  { id: "clock", name: "Clock", icon: "⏰", colors: ["#475569", "#0f172a"], description: "World clock, timer and stopwatch.", category: "Tools", sizeMb: 2, rating: 4.8, core: false, preinstalled: true },
  { id: "todo", name: "To-Do", icon: "✅", colors: ["#6ee7b7", "#059669"], description: "Track tasks and check them off. Saved on your PC.", category: "Productivity", sizeMb: 5, rating: 4.5, core: false, preinstalled: false },
  { id: "browser", name: "Browser", icon: "🌐", colors: ["#7dd3fc", "#0284c7"], description: "Browse the web with bookmarks and back navigation.", category: "Internet", sizeMb: 25, rating: 4.4, core: false, preinstalled: false },
  { id: "paint", name: "Paint", icon: "🎨", colors: ["#f0abfc", "#9333ea"], description: "Draw, undo and save pictures to your PC.", category: "Media", sizeMb: 12, rating: 4.6, core: false, preinstalled: false },
  { id: "piano", name: "Piano", icon: "🎹", colors: ["#fbcfe8", "#9d174d"], description: "Play a synth piano with touch or keyboard.", category: "Media", sizeMb: 18, rating: 4.7, core: false, preinstalled: false },
  { id: "snake", name: "Snake", icon: "🐍", colors: ["#86efac", "#15803d"], description: "The classic snake game with saved high scores.", category: "Games", sizeMb: 6, rating: 4.8, core: false, preinstalled: false },
  { id: "2048", name: "2048", icon: "🔢", colors: ["#fcd34d", "#b45309"], description: "Slide and merge tiles. Your game is saved to the PC.", category: "Games", sizeMb: 8, rating: 4.9, core: false, preinstalled: false },
];

export type SystemSettings = {
  ownerName: string;
  wallpaper: number;
  darkMode: boolean;
  sound: boolean;
  brightness: number;
  quotaMb: number;
};

export const DEFAULT_SETTINGS: SystemSettings = {
  ownerName: "My Phone",
  wallpaper: 0,
  darkMode: false,
  sound: true,
  brightness: 100,
  quotaMb: 10240,
};

export const WALLPAPERS: { name: string; css: string }[] = [
  { name: "Aurora", css: "linear-gradient(160deg,#0f2027,#203a43 50%,#2c5364)" },
  { name: "Sunset", css: "linear-gradient(160deg,#ff9a8b,#ff6a88 45%,#ff99ac)" },
  { name: "Ocean", css: "linear-gradient(160deg,#2193b0,#6dd5ed)" },
  { name: "Galaxy", css: "linear-gradient(160deg,#141e30,#243b55 60%,#6a3093)" },
  { name: "Mint", css: "linear-gradient(160deg,#00b09b,#96c93d)" },
  { name: "Midnight", css: "linear-gradient(160deg,#000000,#434343)" },
];

export const DOCK_IDS = ["files", "browser", "notes", "settings"];

export const FOLDERS: string[] = ["/Documents", "/Notes", "/Pictures", "/Downloads"];

export type StorageInfo = {
  quotaMb: number;
  appsMb: number;
  filesBytes: number;
  usedBytes: number;
  disk: { totalBytes: number; freeBytes: number } | null;
  system: {
    hostname: string;
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCount: number;
    totalMem: number;
    freeMem: number;
    uptime: number;
    serverUptime: number;
    nodeVersion: string;
  };
};
