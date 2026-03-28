"use client";

import { DEFAULT_PROJECT_ID, ensureProjectsBootstrap, getActiveProjectId, scopedKey } from "@/app/app/lib/activeProject";

/**
 * materialsStore.ts
 *
 * MVP-хранилище файлов для шага 4 «Материалы».
 *
 * - Метаданные (список файлов) храним в localStorage (быстро показать UI).
 * - Содержимое файлов (Blob) храним в IndexedDB (чтобы не упереться в лимит localStorage).
 *
 * FileRef — это строка вида: "commercial:<id>" | "price:<id>" | "brand:<id>"
 * Её можно сохранять в projectFact.materials.*Files.
 */

export type MaterialKind = "commercial" | "price" | "brand";

export type MaterialFileMeta = {
  id: string;
  kind: MaterialKind;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  createdAt: string; // ISO
};

export type ParsedFileRef = { kind: MaterialKind; id: string };

const DB_VERSION = 1;
const STORE_NAME = "materials";

function lsKey(): string {
  ensureProjectsBootstrap();
  return scopedKey("materials.v1");
}

function materialsDbName(): string {
  const id = getActiveProjectId();
  return id === DEFAULT_PROJECT_ID ? "knopka" : `knopka_p_${id}`;
}

type LsShape = {
  commercial: MaterialFileMeta[];
  price: MaterialFileMeta[];
  brand: MaterialFileMeta[];
};

function nowIso() {
  return new Date().toISOString();
}

function uid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isKind(v: unknown): v is MaterialKind {
  return v === "commercial" || v === "price" || v === "brand";
}

/**
 * ВАЖНО:
 * Эту функцию у тебя импортирует /app/onboarding/review
 * Ошибка была из-за того, что export отсутствовал.
 */
export function parseFileRef(ref: string): ParsedFileRef | null {
  if (typeof ref !== "string" || ref.trim().length === 0) return null;
  const [k, id, ...rest] = ref.split(":");
  if (rest.length > 0) return null;
  if (!isKind(k)) return null;
  if (!id || id.trim().length === 0) return null;
  return { kind: k, id };
}

export function makeFileRef(kind: MaterialKind, id: string): string {
  return `${kind}:${id}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let dbBoundName: string | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available on server"));
  }
  const name = materialsDbName();
  if (dbBoundName !== name) {
    dbPromise = null;
    dbBoundName = name;
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });

  return dbPromise;
}

function readLs(): LsShape {
  if (typeof window === "undefined") {
    return { commercial: [], price: [], brand: [] };
  }
  const raw = window.localStorage.getItem(lsKey());
  if (!raw) return { commercial: [], price: [], brand: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<LsShape>;
    const pick = (v: unknown): MaterialFileMeta[] =>
      Array.isArray(v)
        ? v
            .map((x) => x as Partial<MaterialFileMeta> & Record<string, unknown>)
            .map((m) => ({
              id: typeof m.id === "string" ? m.id : uid(),
              kind: isKind(m.kind) ? m.kind : "commercial",
              name: typeof m.name === "string" ? m.name : "file",
              size: typeof m.size === "number" && Number.isFinite(m.size) ? m.size : 0,
              type: typeof m.type === "string" ? m.type : "",
              lastModified:
                typeof m.lastModified === "number" && Number.isFinite(m.lastModified)
                  ? m.lastModified
                  : 0,
              createdAt: typeof m.createdAt === "string" ? m.createdAt : nowIso(),
            }))
        : [];

    return {
      commercial: pick(parsed.commercial),
      price: pick(parsed.price),
      brand: pick(parsed.brand),
    };
  } catch {
    return { commercial: [], price: [], brand: [] };
  }
}

function writeLs(next: LsShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(lsKey(), JSON.stringify(next));
  // единое событие, чтобы UI обновлялся
  window.dispatchEvent(new Event("knopka:materialsUpdated"));
}

function txReq<T = unknown>(
  req: IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

async function idbPut(key: string, value: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(value, key);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const blob = await txReq(store.get(key));
  return (blob as Blob) ?? null;
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(key);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

function idbKey(kind: MaterialKind, id: string) {
  return `${kind}:${id}`;
}

/** Вернёт список метаданных (без Blob). */
export function listMaterials(kind: MaterialKind): MaterialFileMeta[] {
  const ls = readLs();
  return ls[kind] ?? [];
}

/**
 * Добавить файлы в хранилище.
 * Возвращает: мета и refs (которые можно сохранить в projectFact).
 */
export async function addMaterials(
  kind: MaterialKind,
  files: File[]
): Promise<{ metas: MaterialFileMeta[]; refs: string[] }> {
  const ls = readLs();
  const metas: MaterialFileMeta[] = [];
  const refs: string[] = [];

  for (const f of files) {
    const id = uid();
    const meta: MaterialFileMeta = {
      id,
      kind,
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
      createdAt: nowIso(),
    };

    await idbPut(idbKey(kind, id), f);
    metas.push(meta);
    refs.push(makeFileRef(kind, id));
  }

  const next: LsShape = {
    ...ls,
    [kind]: [...(ls[kind] ?? []), ...metas],
  } as LsShape;

  writeLs(next);
  return { metas, refs };
}

/** Удалить файл по ref */
export async function removeMaterial(ref: string): Promise<void> {
  const parsed = parseFileRef(ref);
  if (!parsed) return;

  const { kind, id } = parsed;

  const ls = readLs();
  const next: LsShape = {
    ...ls,
    [kind]: (ls[kind] ?? []).filter((m) => m.id !== id),
  } as LsShape;

  writeLs(next);
  await idbDel(idbKey(kind, id));
}

/**
 * Получить blob для файла.
 * Полезно для скачивания/превью.
 */
export async function getMaterialBlob(ref: string): Promise<Blob | null> {
  const parsed = parseFileRef(ref);
  if (!parsed) return null;
  return idbGet(idbKey(parsed.kind, parsed.id));
}

/**
 * Быстро получить имя файла по ref.
 * (UI-штука: показывать, что загружено)
 */
export function getMaterialName(ref: string): string {
  const parsed = parseFileRef(ref);
  if (!parsed) return "";
  const list = listMaterials(parsed.kind);
  const hit = list.find((m) => m.id === parsed.id);
  return hit?.name ?? "";
}

/** Полная очистка (для дебага/сброса) */
export async function clearAllMaterials(): Promise<void> {
  const ls = readLs();
  // удаляем все blobs
  for (const kind of ["commercial", "price", "brand"] as MaterialKind[]) {
    for (const m of ls[kind] ?? []) {
      await idbDel(idbKey(kind, m.id));
    }
  }

  writeLs({ commercial: [], price: [], brand: [] });
}
