import type {
  CompetitorChannelHint,
  CompetitorMapRow,
  CompetitorSiteRow,
} from "@/app/app/lib/strategy/competitorTypes";

export function channelLabelRu(c: CompetitorChannelHint): string {
  switch (c) {
    case "seo":
      return "SEO";
    case "ads":
      return "Реклама";
    case "mixed":
      return "Смешанно";
    default:
      return "Неясно";
  }
}

function csvCell(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function bomCsv(rows: string[][]): string {
  const lines = rows.map((r) => r.map(csvCell).join(";"));
  return "\uFEFF" + lines.join("\r\n");
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSitesTableCsv(rows: CompetitorSiteRow[], baseName: string) {
  const header = [
    "№",
    "ТОП",
    "Конкурент",
    "Сегмент",
    "Цена-якорь",
    "Позиционирование/оффер",
    "Сильные стороны",
    "Слабые места / куда бить",
    "Источник",
    "SEO / реклама (оценка)",
  ];
  const body: string[][] = [
    header,
    ...rows.map((r) => [
      String(r.num),
      r.top,
      r.competitor,
      r.segment,
      r.priceAnchor,
      r.positioning,
      r.strengths,
      r.weaknesses,
      r.source,
      channelLabelRu(r.channel),
    ]),
  ];
  triggerDownload(bomCsv(body), `${baseName}-сайты.csv`, "text/csv;charset=utf-8");
}

export function downloadMapsTableCsv(rows: CompetitorMapRow[], baseName: string, kind: "yandex" | "gis2") {
  const suffix = kind === "yandex" ? "яндекс-карты" : "2гис";
  const header = [
    "№",
    "ТОП по картам",
    "Конкурент",
    "Локация/метро",
    "Рейтинг/оценки/отзывы",
    "Что видно в карточке",
    "Сильная сторона по картам",
    "Куда бить",
    "Источник",
  ];
  const body: string[][] = [
    header,
    ...rows.map((r) => [
      String(r.num),
      r.top,
      r.competitor,
      r.location,
      r.rating,
      r.cardSnippet,
      r.strengthMaps,
      r.weakness,
      r.source,
    ]),
  ];
  triggerDownload(bomCsv(body), `${baseName}-${suffix}.csv`, "text/csv;charset=utf-8");
}
