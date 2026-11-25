"use client";

import { useState, type FormEvent } from "react";
import { useAppState } from "@/lib/hooks";
import { uid } from "@/lib/client";
import { btnGhost, input } from "./ui";

type Bookmark = { id: string; title: string; url: string };

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: "wiki", title: "Wikipedia", url: "https://en.wikipedia.org/" },
  { id: "mdn", title: "MDN Docs", url: "https://developer.mozilla.org/" },
  { id: "hn", title: "Hacker News", url: "https://news.ycombinator.com/" },
  { id: "wttr", title: "Weather", url: "https://wttr.in/" },
  { id: "gh", title: "GitHub", url: "https://github.com/" },
  { id: "ex", title: "Example", url: "https://example.com/" },
];

/** Turns free text into a URL: addresses stay addresses, everything else becomes a search. */
function normalize(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[^\s]+\.[^\s]+$/.test(s)) return `https://${s}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}

export default function BrowserApp() {
  const [bookmarks, setBookmarks, loaded] = useAppState<Bookmark[]>("browser", "bookmarks", DEFAULT_BOOKMARKS);
  const [history, setHistory] = useState<string[]>([]);
  const [idx, setIdx] = useState(-1);
  const [addr, setAddr] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const current = idx >= 0 ? history[idx] : "";

  const go = (raw: string) => {
    const url = normalize(raw);
    if (!url) return;
    setHistory((h) => [...h.slice(0, idx + 1), url]);
    setIdx((i) => i + 1);
    setAddr(url);
    setLoading(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(addr);
  };

  const back = () => {
    if (idx <= 0) {
      setIdx(-1);
      setAddr("");
      return;
    }
    setIdx(idx - 1);
    setAddr(history[idx - 1]);
    setLoading(true);
  };

  const home = () => {
    setIdx(-1);
    setAddr("");
  };

  const isBookmarked = bookmarks.some((b) => b.url === current);
  const toggleBookmark = () => {
    if (!current) return;
    if (isBookmarked) setBookmarks((prev) => prev.filter((b) => b.url !== current));
    else {
      let title = current;
      try {
        title = new URL(current).hostname.replace(/^www\./, "");
      } catch {
        /* keep url */
      }
      setBookmarks((prev) => [...prev, { id: uid(), title, url: current }]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={submit} className="flex items-center gap-2">
          <button type="button" onClick={back} className={btnGhost} aria-label="Back">
            ‹
          </button>
          <button type="button" onClick={home} className={btnGhost} aria-label="Home">
            ⌂
          </button>
          <input
            className={`${input} py-1.5`}
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="Search or enter address"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Address"
          />
          <button type="submit" className={btnGhost}>
            Go
          </button>
        </form>
        {current && (
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setReloadKey((k) => k + 1)} className="rounded-lg bg-slate-200 px-2 py-1 dark:bg-slate-800">
              ↻ Reload
            </button>
            <button onClick={toggleBookmark} className="rounded-lg bg-slate-200 px-2 py-1 dark:bg-slate-800">
              {isBookmarked ? "★ Bookmarked" : "☆ Bookmark"}
            </button>
            <a href={current} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-2 py-1 text-white">
              ↗ Open in new tab
            </a>
            {loading && <span className="ml-auto text-slate-500">Loading…</span>}
          </div>
        )}
      </div>

      {current ? (
        <div className="relative min-h-0 flex-1">
          <iframe
            key={`${current}-${reloadKey}`}
            src={current}
            title="Web page"
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setLoading(false)}
          />
          <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 p-2 text-center text-[11px] text-white">
            Some sites block embedded viewing. If the page is blank, tap “Open in new tab”.
          </p>
        </div>
      ) : (
        <div className="no-scrollbar flex-1 overflow-y-auto p-5">
          <h3 className="text-center text-2xl font-semibold">Start page</h3>
          <p className="mb-6 text-center text-xs text-slate-500">Bookmarks are saved to your PC.</p>
          <div className="grid grid-cols-3 gap-4">
            {bookmarks.map((b) => (
              <div key={b.id} className="relative">
                <button
                  onClick={() => go(b.url)}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl p-2 active:scale-95"
                >
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-white shadow"
                    style={{ background: "linear-gradient(145deg,#38bdf8,#2563eb)" }}
                  >
                    {b.title.charAt(0).toUpperCase()}
                  </span>
                  <span className="w-full truncate text-center text-xs">{b.title}</span>
                </button>
                <button
                  aria-label={`Remove ${b.title}`}
                  onClick={() => setBookmarks((prev) => prev.filter((x) => x.id !== b.id))}
                  className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-slate-300 text-[10px] dark:bg-slate-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {!loaded && <p className="mt-6 text-center text-xs text-slate-500">Syncing bookmarks…</p>}
        </div>
      )}
    </div>
  );
}
