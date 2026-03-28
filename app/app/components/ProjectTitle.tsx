"use client";

import { useEffect, useState } from "react";

import { getProjectFactStorageKey, loadProjectFact } from "@/app/app/lib/projectFact";

export default function ProjectTitle({
  fallback = "Проект",
}: {
  fallback?: string;
}) {
  const [title, setTitle] = useState<string>(fallback);

  const read = () => {
    const f = loadProjectFact() as { projectName?: string };
    const name = String(f?.projectName ?? "").trim();
    setTitle(name || fallback);
  };

  useEffect(() => {
    read();

    const onUpdated = () => read();
    const onStorage = (e: StorageEvent) => {
      const key = getProjectFactStorageKey();
      if (!e.key || e.key === key) read();
    };
    const onProject = () => read();

    window.addEventListener("knopka:projectFactUpdated", onUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("knopka:activeProjectChanged", onProject);

    return () => {
      window.removeEventListener("knopka:projectFactUpdated", onUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("knopka:activeProjectChanged", onProject);
    };
  }, [fallback]);

  return <span className="truncate">{title}</span>;
}
