import { useEffect, useState, useMemo } from "react";
import { Command } from "cmdk";
import type { Assignment } from "../types";

interface Props {
  assignments: Assignment[];
  onSelectAssignment: (id: string | number) => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
  onSwitchView: (view: "dashboard" | "plan") => void;
}

export function CommandPalette({ assignments, onSelectAssignment, onRefresh, onToggleTheme, onSwitchView }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return assignments.slice(0, 10);
    const q = search.toLowerCase();
    return assignments.filter(a =>
      a.name.toLowerCase().includes(q) || a.course_name.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [assignments, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg">
        <Command
          className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search assignments, actions..."
            className="w-full border-b border-gray-200 dark:border-zinc-700 bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 outline-none"
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
              No results found.
            </Command.Empty>

            {filtered.length > 0 && (
              <Command.Group heading="Assignments" className="text-xs font-medium text-gray-400 dark:text-zinc-500 px-2 py-1.5">
                {filtered.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.name} ${a.course_name}`}
                    onSelect={() => { onSelectAssignment(a.id); setOpen(false); setSearch(""); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <span className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">{a.course_name}</span>
                    <span className="truncate">{a.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Actions" className="text-xs font-medium text-gray-400 dark:text-zinc-500 px-2 py-1.5 mt-1">
              <Command.Item
                onSelect={() => { onRefresh(); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-zinc-800"
              >
                Refresh Assignments
              </Command.Item>
              <Command.Item
                onSelect={() => { onToggleTheme(); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-zinc-800"
              >
                Toggle Theme
              </Command.Item>
              <Command.Item
                onSelect={() => { onSwitchView("dashboard"); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-zinc-800"
              >
                Go to Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => { onSwitchView("plan"); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-zinc-800"
              >
                Go to Weekly Plan
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="border-t border-gray-200 dark:border-zinc-700 px-4 py-2 text-xs text-gray-400 dark:text-zinc-500">
            <kbd className="rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">↑↓</kbd> navigate <kbd className="ml-2 rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">↵</kbd> select <kbd className="ml-2 rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">esc</kbd> close
          </div>
        </Command>
      </div>
    </div>
  );
}
