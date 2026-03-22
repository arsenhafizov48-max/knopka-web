"use client";


import { useEffect, useState } from "react";
import {
loadProjectFact,
PROJECT_FACT_STORAGE_KEY,
} from "@/app/app/lib/projectFact";


export default function ProjectTitle({
fallback = "Проект",
}: {
fallback?: string;
}) {
const [title, setTitle] = useState<string>(fallback);


const read = () => {
const f: any = loadProjectFact();
const name = String(f?.projectName ?? "").trim();
setTitle(name || fallback);
};


useEffect(() => {
read();


const onUpdated = () => read();
const onStorage = (e: StorageEvent) => {
if (!e.key || e.key === PROJECT_FACT_STORAGE_KEY) read();
};


window.addEventListener("knopka:projectFactUpdated", onUpdated);
window.addEventListener("storage", onStorage);


return () => {
window.removeEventListener("knopka:projectFactUpdated", onUpdated);
window.removeEventListener("storage", onStorage);
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


return <span className="truncate">{title}</span>;
}