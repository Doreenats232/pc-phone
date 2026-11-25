"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { FOLDERS, MB } from "@/lib/catalog";
import { api, fmtBytes } from "@/lib/client";
import { AppShell, Bar, btn, btnDanger, btnGhost, card, input } from "./ui";

type FileRow = {
  id: string;
  folder: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};
type FileFull = FileRow & { content: string };

const MAX_UPLOAD = 25 * MB;
const TEXT_EXT = /\.(txt|md|json|csv|js|ts|tsx|jsx|html|css|xml|log)$/i;

function isTextLike(mime: string, name: string) {
  return mime.startsWith("text/") || mime === "application/json" || TEXT_EXT.test(name);
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.startsWith("video/")) return "🎬";
  if (mime === "application/pdf") return "📕";
  if (mime.startsWith("text/") || mime === "application/json") return "📄";
  return "📦";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

const dateStr = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function FilesApp() {
  const { notify, refreshStorage, storage, settings } = useOS();
  const [folder, setFolder] = useState("/Documents");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<FileFull | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ files: FileRow[] }>(`/api/files?folder=${encodeURIComponent(folder)}`);
      setFiles(d.files);
    } catch (e) {
      notify({ title: "Couldn't open folder", body: (e as Error).message, icon: "⚠️" });
    }
  }, [folder, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => files.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase())),
    [files, query],
  );

  const quotaBytes = settings.quotaMb * MB;
  const usedBytes = storage?.usedBytes ?? 0;

  const run = async (fn: () => Promise<void>, errTitle: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify({ title: errTitle, body: (e as Error).message, icon: "⚠️" });
    } finally {
      setBusy(false);
    }
  };

  const createFile = () =>
    run(async () => {
      const name = window.prompt("New file name", "Untitled.txt");
      if (!name) return;
      await api("/api/files", { method: "POST", json: { folder, name, content: "", mimeType: "text/plain" } });
      await Promise.all([load(), refreshStorage()]);
    }, "Couldn't create file");

  const upload = (file: File) =>
    run(async () => {
      if (file.size > MAX_UPLOAD) {
        notify({ title: "File too large", body: "Uploads are limited to 25 MB.", icon: "⚠️" });
        return;
      }
      const content = isTextLike(file.type, file.name) ? await file.text() : await readAsDataUrl(file);
      await api("/api/files", {
        method: "POST",
        json: { folder, name: file.name, content, mimeType: file.type || "application/octet-stream" },
      });
      notify({ title: "Saved to PC", body: `${file.name} → ${folder}`, icon: "📁" });
      await Promise.all([load(), refreshStorage()]);
    }, "Upload failed");

  const openFile = (row: FileRow) =>
    run(async () => {
      const d = await api<{ file: FileFull }>(`/api/files/${row.id}`);
      setViewing(d.file);
      setDraft(d.file.content);
    }, "Couldn't open file");

  const isTextual = (f: FileFull) => isTextLike(f.mimeType, f.name) && !f.content.startsWith("data:");

  const saveDraft = () => {
    if (!viewing) return;
    return run(async () => {
      const d = await api<{ file: FileFull }>(`/api/files/${viewing.id}`, { method: "PATCH", json: { content: draft } });
      setViewing(d.file);
      setDraft(d.file.content);
      notify({ title: "File saved", body: viewing.name, icon: "💾" });
      await Promise.all([load(), refreshStorage()]);
    }, "Save failed");
  };

  const rename = () => {
    if (!viewing) return;
    return run(async () => {
      const name = window.prompt("Rename to", viewing.name);
      if (!name || name === viewing.name) return;
      const d = await api<{ file: FileFull }>(`/api/files/${viewing.id}`, { method: "PATCH", json: { name } });
      setViewing((v) => (v ? { ...v, name: d.file.name } : v));
      await load();
    }, "Rename failed");
  };

  const moveTo = (target: string) => {
    if (!viewing || target === viewing.folder) return;
    return run(async () => {
      const d = await api<{ file: FileFull }>(`/api/files/${viewing.id}`, { method: "PATCH", json: { folder: target } });
      setViewing(d.file);
      await load();
      notify({ title: "File moved", body: `Now in ${target}`, icon: "📂" });
    }, "Move failed");
  };

  const remove = (f: FileFull) =>
    run(async () => {
      if (!window.confirm(`Delete "${f.name}" from your PC?`)) return;
      await api(`/api/files/${f.id}`, { method: "DELETE" });
      setViewing(null);
      await Promise.all([load(), refreshStorage()]);
      notify({ title: "File deleted", body: f.name, icon: "🗑️" });
    }, "Delete failed");

  const download = (f: FileFull) => {
    const isData = f.content.startsWith("data:");
    const href = isData ? f.content : URL.createObjectURL(new Blob([f.content], { type: f.mimeType || "text/plain" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (!isData) setTimeout(() => URL.revokeObjectURL(href), 1500);
  };

  // ---- File viewer / editor ----
  if (viewing) {
    const textual = isTextual(viewing);
    const image = viewing.mimeType.startsWith("image/") && viewing.content.startsWith("data:");
    return (
      <AppShell
        title={viewing.name}
        right={
          <button className={btnGhost} onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewing.folder} · {fmtBytes(viewing.sizeBytes)} · updated {dateStr(viewing.updatedAt)}
          </p>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.content} alt={viewing.name} className="mx-auto max-h-[55vh] rounded-xl shadow" />
          )}
          {textual && (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={`${input} min-h-[50vh] font-mono text-[13px]`}
              spellCheck={false}
            />
          )}
          {!textual && !image && (
            <div className={card}>
              <p className="text-sm">Preview isn&apos;t available for this file type.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {textual && (
              <button className={btn} disabled={busy || draft === viewing.content} onClick={saveDraft}>
                Save to PC
              </button>
            )}
            <button className={btnGhost} onClick={() => download(viewing)}>
              Download
            </button>
            <button className={btnGhost} onClick={rename} disabled={busy}>
              Rename
            </button>
            <select
              value={viewing.folder}
              onChange={(e) => void moveTo(e.target.value)}
              className={`${input} w-auto`}
              aria-label="Move to folder"
            >
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button className={btnDanger} onClick={() => remove(viewing)} disabled={busy}>
              Delete
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Folder listing ----
  return (
    <AppShell
      title="Files"
      right={
        <>
          <button className={btnGhost} onClick={createFile} disabled={busy}>
            + New
          </button>
          <button className={btn} onClick={() => inputRef.current?.click()} disabled={busy}>
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
        </>
      }
    >
      <div className="space-y-3 p-4">
        <div className={`${card} text-sm`}>
          <div className="flex justify-between">
            <span>PC storage</span>
            <span className="text-slate-500 dark:text-slate-400">
              {fmtBytes(usedBytes)} / {fmtBytes(quotaBytes)}
            </span>
          </div>
          <div className="mt-2">
            <Bar pct={(usedBytes / quotaBytes) * 100} />
          </div>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                folder === f ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <input className={input} placeholder="Search in this folder" value={query} onChange={(e) => setQuery(e.target.value)} />

        <div className="space-y-2">
          {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">This folder is empty.</p>}
          {visible.map((f) => (
            <button key={f.id} onClick={() => openFile(f)} className={`${card} flex w-full items-center gap-3 text-left`}>
              <span className="text-2xl">{iconFor(f.mimeType)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtBytes(f.sizeBytes)} · {dateStr(f.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
