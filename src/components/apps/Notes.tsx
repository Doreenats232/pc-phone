"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOS } from "@/components/phone/os-context";
import { api, fmtBytes } from "@/lib/client";
import { AppShell, btn, btnDanger, btnGhost, input } from "./ui";

type NoteRow = { id: string; name: string; sizeBytes: number; updatedAt: string };
type Note = { id: string; name: string; content: string; dirty: boolean };

const FOLDER = "/Notes";

export default function NotesApp() {
  const { notify, refreshStorage } = useOS();
  const [list, setList] = useState<NoteRow[]>([]);
  const [cur, setCur] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const curRef = useRef<Note | null>(null);

  useEffect(() => {
    curRef.current = cur;
  }, [cur]);

  const loadList = useCallback(async () => {
    try {
      const d = await api<{ files: NoteRow[] }>(`/api/files?folder=${encodeURIComponent(FOLDER)}`);
      setList(d.files);
    } catch (e) {
      notify({ title: "Notes", body: (e as Error).message, icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const saveNote = useCallback(
    async (n: Note) => {
      try {
        const d = await api<{ file: NoteRow }>(`/api/files/${n.id}`, {
          method: "PATCH",
          json: { name: n.name, content: n.content },
        });
        setCur((c) => (c && c.id === n.id && c.content === n.content && c.name === n.name ? { ...c, dirty: false } : c));
        setList((l) =>
          l.map((x) => (x.id === n.id ? { ...x, name: d.file.name, sizeBytes: d.file.sizeBytes, updatedAt: d.file.updatedAt } : x)),
        );
        void refreshStorage();
      } catch (e) {
        notify({ title: "Couldn't save note", body: (e as Error).message, icon: "⚠️" });
      }
    },
    [notify, refreshStorage],
  );

  // Debounced autosave while typing.
  useEffect(() => {
    if (!cur || !cur.dirty) return;
    const t = setTimeout(() => void saveNote(cur), 700);
    return () => clearTimeout(t);
  }, [cur, saveNote]);

  // Flush unsaved edits if the app is closed.
  useEffect(
    () => () => {
      const c = curRef.current;
      if (c?.dirty) {
        void fetch(`/api/files/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: c.name, content: c.content }),
          keepalive: true,
        });
      }
    },
    [],
  );

  const flush = async () => {
    if (cur?.dirty) await saveNote(cur);
  };

  const openNote = async (row: NoteRow) => {
    await flush();
    try {
      const d = await api<{ file: { id: string; name: string; content: string } }>(`/api/files/${row.id}`);
      setCur({ id: d.file.id, name: d.file.name, content: d.file.content, dirty: false });
    } catch (e) {
      notify({ title: "Couldn't open note", body: (e as Error).message, icon: "⚠️" });
    }
  };

  const newNote = async () => {
    await flush();
    try {
      const name = `Note ${list.length + 1}.txt`;
      const d = await api<{ file: { id: string; name: string; content: string } }>("/api/files", {
        method: "POST",
        json: { folder: FOLDER, name, content: "", mimeType: "text/plain" },
      });
      setCur({ id: d.file.id, name: d.file.name, content: "", dirty: false });
      await loadList();
      void refreshStorage();
    } catch (e) {
      notify({ title: "Couldn't create note", body: (e as Error).message, icon: "⚠️" });
    }
  };

  const closeNote = async () => {
    await flush();
    setCur(null);
    void loadList();
  };

  const deleteNote = async () => {
    if (!cur) return;
    if (!window.confirm(`Delete "${cur.name.replace(/\.txt$/, "")}"?`)) return;
    try {
      await api(`/api/files/${cur.id}`, { method: "DELETE" });
      setCur(null);
      await loadList();
      void refreshStorage();
    } catch (e) {
      notify({ title: "Delete failed", body: (e as Error).message, icon: "⚠️" });
    }
  };

  if (!cur) {
    return (
      <AppShell title="Notes" right={<button className={btn} onClick={newNote}>+ New</button>}>
        <div className="space-y-2 p-4">
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading notes from your PC…</p>}
          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">No notes yet. Tap “+ New”.</p>
          )}
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => openNote(n)}
              className="flex w-full flex-col items-start rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-slate-900"
            >
              <span className="font-medium">{n.name.replace(/\.txt$/, "")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(n.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {fmtBytes(n.sizeBytes)}
              </span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  const title = cur.name.replace(/\.txt$/, "");
  return (
    <AppShell
      title="Note"
      right={
        <button className={btnGhost} onClick={closeNote}>
          Done
        </button>
      }
    >
      <div className="flex h-full min-h-[70vh] flex-col gap-3 p-4">
        <input
          className={`${input} text-base font-semibold`}
          value={title}
          placeholder="Title"
          onChange={(e) => setCur((c) => (c ? { ...c, name: `${e.target.value}.txt`, dirty: true } : c))}
        />
        <textarea
          className={`${input} min-h-[50vh] flex-1 resize-none leading-relaxed`}
          value={cur.content}
          placeholder="Start writing…"
          onChange={(e) => setCur((c) => (c ? { ...c, content: e.target.value, dirty: true } : c))}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {cur.dirty ? "Saving to PC…" : "Saved to your PC · /Notes"}
          </span>
          <button className={btnDanger} onClick={deleteNote}>
            Delete
          </button>
        </div>
      </div>
    </AppShell>
  );
}
