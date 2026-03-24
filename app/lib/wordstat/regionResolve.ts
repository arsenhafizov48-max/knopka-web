import { unstable_cache } from "next/cache";

import { wordstatGetRegionsTree } from "./client";

/** Дерево регионов кэшируем сутки — не тратим квоту на каждый анализ. */
export const getWordstatRegionsTreeCached = unstable_cache(
  async () => {
    const r = await wordstatGetRegionsTree();
    if (!r.ok) return null;
    return r.data;
  },
  ["wordstat-regions-tree-v1"],
  { revalidate: 86_400 }
);

type FlatRegion = { id: number; name: string };

function walkRegions(node: unknown, out: FlatRegion[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) walkRegions(x, out);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  const idRaw = o.regionId ?? o.id;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string" && /^\d+$/.test(idRaw)
        ? parseInt(idRaw, 10)
        : NaN;
  const nameRaw = [o.name, o.title, o.regionName].find((x) => typeof x === "string") as string | undefined;
  if (Number.isFinite(id) && nameRaw) {
    out.push({ id, name: nameRaw });
  }
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) {
      for (const x of v) walkRegions(x, out);
    } else if (v && typeof v === "object") {
      walkRegions(v, out);
    }
  }
}

function flattenRegions(tree: unknown): FlatRegion[] {
  const out: FlatRegion[] = [];
  walkRegions(tree, out);
  const seen = new Set<number>();
  return out.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

/** Вся РФ / без привязки — в API Вордстата не передаём regions → по умолчанию все регионы. */
export function isAllRussiaGeo(geo: string): boolean {
  const g = norm(geo);
  if (!g) return true;
  return (
    /\bрф\b/.test(g) ||
    g.includes("россия") ||
    g.includes("по россии") ||
    g.includes("вся россия") ||
    g.includes("вся рф") ||
    g === "рф" ||
    g.includes("российск")
  );
}

/**
 * Подбираем id регионов Вордстата по строке географии из фактуры.
 * Возвращает undefined → запрос по всей стране.
 */
export function resolveWordstatRegionIds(geo: string, tree: unknown): number[] | undefined {
  const g = norm(geo);
  if (!g || isAllRussiaGeo(geo)) return undefined;

  const flat = flattenRegions(tree);
  if (!flat.length) return undefined;

  const tokens = g
    .split(/[,;]/)
    .map((t) => norm(t))
    .filter((t) => t.length >= 2);

  const haystack = tokens.length ? tokens : [g];

  const scored: { id: number; name: string; score: number }[] = [];

  for (const { id, name } of flat) {
    const nn = norm(name);
    for (const token of haystack) {
      if (token === nn) {
        scored.push({ id, name, score: 100 });
        break;
      }
      if (nn.startsWith(token) || token.startsWith(nn)) {
        scored.push({ id, name, score: 80 });
        break;
      }
      if (nn.includes(token) || token.includes(nn)) {
        scored.push({ id, name, score: 60 });
        break;
      }
    }
  }

  if (!scored.length) return undefined;

  scored.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
  const best = scored[0];
  return [best.id];
}

export function regionLabelForUi(geo: string, ids: number[] | undefined, tree: unknown): string {
  if (!ids?.length || isAllRussiaGeo(geo)) {
    return isAllRussiaGeo(geo) || !norm(geo) ? "Россия (все регионы)" : `${geo.trim()} (все регионы — уточните город в фактуре)`;
  }
  const flat = flattenRegions(tree);
  const names = ids.map((id) => flat.find((r) => r.id === id)?.name).filter(Boolean);
  if (names.length) return `${names.join(", ")} (Вордстат)`;
  return `Регионы id: ${ids.join(", ")}`;
}
