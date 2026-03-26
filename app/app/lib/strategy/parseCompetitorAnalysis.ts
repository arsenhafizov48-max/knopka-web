import type {
  CompetitorAnalysisPayload,
  CompetitorChannelHint,
  CompetitorMapRow,
  CompetitorSiteRow,
} from "@/app/app/lib/strategy/competitorTypes";

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function channel(v: unknown): CompetitorChannelHint {
  const s = str(v).toLowerCase();
  if (s === "seo" || s === "реклама" || s === "ads" || s === "контекст") {
    return s === "seo" ? "seo" : "ads";
  }
  if (s === "mixed" || s === "смешанно") return "mixed";
  if (s === "unknown" || s === "непонятно" || s === "—") return "unknown";
  if (s.includes("смеш") || s.includes("оба")) return "mixed";
  if (s.includes("seo") || s.includes("органик")) return "seo";
  if (s.includes("реклам") || s.includes("директ") || s.includes("ads")) return "ads";
  return "unknown";
}

function siteRow(o: Record<string, unknown>, idx: number): CompetitorSiteRow {
  return {
    num: num(o.num, idx + 1),
    top: str(o.top) || "—",
    competitor: str(o.competitor) || str(o.name) || "—",
    segment: str(o.segment) || "—",
    priceAnchor: str(o.priceAnchor) || str(o.price_anchor) || "—",
    positioning: str(o.positioning) || str(o.offer) || "—",
    strengths: str(o.strengths) || "—",
    weaknesses: str(o.weaknesses) || str(o.weakness) || "—",
    source: str(o.source) || "оценка модели",
    channel: channel(o.channel ?? o.channelHint),
  };
}

function mapRow(o: Record<string, unknown>, idx: number): CompetitorMapRow {
  return {
    num: num(o.num, idx + 1),
    top: str(o.top) || "—",
    competitor: str(o.competitor) || str(o.name) || "—",
    location: str(o.location) || str(o.metro) || "—",
    rating: str(o.rating) || str(o.reviews) || "—",
    cardSnippet: str(o.cardSnippet) || str(o.snippet) || str(o.card) || "—",
    strengthMaps: str(o.strengthMaps) || str(o.strength) || "—",
    weakness: str(o.weakness) || str(o.weaknesses) || "—",
    source: str(o.source) || "оценка модели",
  };
}

export function parseCompetitorAnalysisJson(data: unknown): CompetitorAnalysisPayload | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const sitesRaw = Array.isArray(d.sites) ? d.sites : [];
  const ymRaw = Array.isArray(d.yandexMaps) ? d.yandexMaps : Array.isArray(d.yandex_maps) ? d.yandex_maps : [];
  const g2Raw = Array.isArray(d.gis2) ? d.gis2 : Array.isArray(d.gis_2) ? d.gis_2 : [];

  const sites: CompetitorSiteRow[] = sitesRaw
    .map((x, i) => (x && typeof x === "object" ? siteRow(x as Record<string, unknown>, i) : null))
    .filter((x): x is CompetitorSiteRow => x !== null);

  const yandexMaps: CompetitorMapRow[] = ymRaw
    .map((x, i) => (x && typeof x === "object" ? mapRow(x as Record<string, unknown>, i) : null))
    .filter((x): x is CompetitorMapRow => x !== null);

  const gis2: CompetitorMapRow[] = g2Raw
    .map((x, i) => (x && typeof x === "object" ? mapRow(x as Record<string, unknown>, i) : null))
    .filter((x): x is CompetitorMapRow => x !== null);

  if (sites.length === 0 && yandexMaps.length === 0 && gis2.length === 0) return null;

  return { sites, yandexMaps, gis2 };
}
