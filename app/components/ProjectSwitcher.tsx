"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, FolderKanban, Plus } from "lucide-react";

import {
  addProject,
  getActiveProjectId,
  listProjects,
  renameProject,
  setActiveProjectId,
  type ProjectEntry,
} from "@/app/app/lib/activeProject";
import { useRouter } from "next/navigation";

export default function ProjectSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [activeId, setActiveId] = useState("");

  const refresh = useCallback(() => {
    setProjects(listProjects());
    setActiveId(getActiveProjectId());
  }, []);

  useEffect(() => {
    refresh();
    const onMeta = () => refresh();
    const onSwitch = () => refresh();
    window.addEventListener("knopka:projectsMetaUpdated", onMeta);
    window.addEventListener("knopka:activeProjectChanged", onSwitch);
    return () => {
      window.removeEventListener("knopka:projectsMetaUpdated", onMeta);
      window.removeEventListener("knopka:activeProjectChanged", onSwitch);
    };
  }, [refresh]);

  const active = projects.find((p) => p.id === activeId);

  const select = (id: string) => {
    setActiveProjectId(id);
    setOpen(false);
    router.refresh();
  };

  const onAdd = () => {
    const name = window.prompt("Название проекта / второго бизнеса", "Новый проект");
    if (name === null) return;
    const id = addProject(name);
    setActiveProjectId(id);
    setOpen(false);
    router.refresh();
  };

  const onRename = (p: ProjectEntry) => {
    const name = window.prompt("Название проекта", p.name);
    if (name === null || !name.trim()) return;
    renameProject(p.id, name);
    refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-left text-xs font-medium text-neutral-800 hover:bg-white"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <FolderKanban className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
        <span className="truncate">{active?.name ?? "Проект"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default bg-transparent"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-full z-[70] mt-1 min-w-[220px] max-w-[min(100vw-2rem,280px)] rounded-2xl border border-neutral-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={p.id === activeId}
                  onClick={() => select(p.id)}
                  className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                    p.id === activeId ? "bg-[#EDEBFF] font-medium text-neutral-900" : "text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <span className="block truncate">{p.name}</span>
                </button>
                <button
                  type="button"
                  title="Переименовать"
                  onClick={() => onRename(p)}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                >
                  ✎
                </button>
              </div>
            ))}
            <div className="border-t border-neutral-100 p-1">
              <button
                type="button"
                onClick={onAdd}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#5E4FFF] hover:bg-[#F4F2FF]"
              >
                <Plus className="h-4 w-4" />
                Новый проект
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
