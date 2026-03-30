/**
 * Отчёты Яндекс Директ API v5 (сервис Reports) — статистика за период.
 * Документация: https://yandex.ru/dev/direct/doc/ru/reports
 */

const REPORTS_URL = "https://api.direct.yandex.com/json/v5/reports";

export type DirectReportParams = Record<string, unknown>;

/** Строки TSV как массив объектов { колонка: значение } */
export function parseDirectReportTsv(tsv: string): { header: string[]; rows: Record<string, string>[] } {
  const lines = tsv
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { header: [], rows: [] };

  let i = 0;
  // первая строка может быть название отчёта в кавычках
  if (lines[0].startsWith('"') && !lines[0].includes("\t")) {
    i = 1;
  }

  if (i >= lines.length) return { header: [], rows: [] };

  const headerLine = lines[i].split("\t").map((c) => c.trim());
  i += 1;
  const rows: Record<string, string>[] = [];

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("Total rows:")) break;
    const cells = line.split("\t");
    if (cells.length === 0) continue;
    const row: Record<string, string> = {};
    for (let c = 0; c < headerLine.length; c++) {
      row[headerLine[c] ?? `col${c}`] = cells[c]?.trim() ?? "";
    }
    rows.push(row);
  }

  return { header: headerLine, rows };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetrySeconds(retryIn: string | null): number {
  if (!retryIn) return 5;
  const n = Number.parseInt(retryIn, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60) : 5;
}

/**
 * Запрос отчёта с поддержкой online/offline (201/202) и polling.
 */
export async function fetchDirectReportTsv(
  accessToken: string,
  reportParams: DirectReportParams,
  clientLogin: string | null,
  options?: { maxAttempts?: number }
): Promise<{ tsv: string; attempts: number }> {
  const maxAttempts = options?.maxAttempts ?? 40;
  let attempt = 0;
  let lastBody = "";

  while (attempt < maxAttempts) {
    attempt += 1;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "ru",
      "Content-Type": "application/json; charset=utf-8",
      processingMode: "auto",
      returnMoneyInMicros: "false",
    };
    if (clientLogin) {
      headers["Client-Login"] = clientLogin;
    }

    const res = await fetch(REPORTS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ params: reportParams }),
    });

    const text = await res.text();
    lastBody = text;

    if (res.status === 200) {
      return { tsv: text, attempts: attempt };
    }

    if (res.status === 201 || res.status === 202) {
      const retryIn = parseRetrySeconds(res.headers.get("retryIn"));
      await sleep(retryIn * 1000);
      continue;
    }

    if (res.status === 400 || res.status === 500) {
      let hint = text.slice(0, 500);
      try {
        const j = JSON.parse(text) as { error?: { error_string?: string; error_detail?: string } };
        hint = j.error?.error_string || j.error?.error_detail || hint;
      } catch {
        /* raw text */
      }
      throw new Error(`Direct Reports HTTP ${res.status}: ${hint}`);
    }

    throw new Error(`Direct Reports: неожиданный код ${res.status}: ${text.slice(0, 300)}`);
  }

  throw new Error(
    `Direct Reports: превышено число попыток (${maxAttempts}). Последний ответ: ${lastBody.slice(0, 400)}`
  );
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Последние `days` календарных дней до вчера включительно (статистика Директа обычно с задержкой по «сегодня»). */
export function reportDateRangeLastDays(days: number): { dateFrom: string; dateTo: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { dateFrom: ymd(start), dateTo: ymd(end) };
}

const BASE_REPORT_FIELDS = [
  "Date",
  "CampaignId",
  "CampaignName",
  "CampaignType",
  "AdNetworkType",
  "Impressions",
  "Clicks",
  "Cost",
  "Ctr",
  "AvgCpc",
  "Conversions",
  "ConversionRate",
  "CostPerConversion",
  "BounceRate",
] as const;

/** Отчёт по кампаниям за период (для сумм за день / агрегация по датам на клиенте). */
export function buildCampaignPerformanceReport(
  reportName: string,
  dateFrom: string,
  dateTo: string
): DirectReportParams {
  return {
    SelectionCriteria: {
      DateFrom: dateFrom,
      DateTo: dateTo,
    },
    FieldNames: [...BASE_REPORT_FIELDS],
    OrderBy: [{ Field: "Date", SortOrder: "ASCENDING" }],
    ReportName: reportName,
    ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES",
    IncludeDiscount: "YES",
  };
}

/** Статистика по группам объявлений. */
export function buildAdGroupPerformanceReport(
  reportName: string,
  dateFrom: string,
  dateTo: string
): DirectReportParams {
  return {
    SelectionCriteria: {
      DateFrom: dateFrom,
      DateTo: dateTo,
    },
    FieldNames: [
      "Date",
      "CampaignId",
      "CampaignName",
      "AdGroupId",
      "AdGroupName",
      "Impressions",
      "Clicks",
      "Cost",
      "Ctr",
      "AvgCpc",
      "Conversions",
      "CostPerConversion",
      "BounceRate",
    ],
    OrderBy: [{ Field: "Date", SortOrder: "ASCENDING" }],
    ReportName: reportName,
    ReportType: "ADGROUP_PERFORMANCE_REPORT",
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES",
    IncludeDiscount: "YES",
  };
}

/** Поисковые запросы и тип соответствия (офлайн-отчёт). */
export function buildSearchQueryReport(
  reportName: string,
  dateFrom: string,
  dateTo: string
): DirectReportParams {
  return {
    SelectionCriteria: {
      DateFrom: dateFrom,
      DateTo: dateTo,
    },
    FieldNames: [
      "Date",
      "CampaignId",
      "CampaignName",
      "AdGroupId",
      "AdGroupName",
      "Query",
      "MatchType",
      "Impressions",
      "Clicks",
      "Cost",
      "Ctr",
      "AvgCpc",
      "Conversions",
      "CostPerConversion",
    ],
    OrderBy: [{ Field: "Clicks", SortOrder: "DESCENDING" }],
    ReportName: reportName,
    ReportType: "SEARCH_QUERY_PERFORMANCE_REPORT",
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES",
    IncludeDiscount: "YES",
  };
}

export type YandexDirectReportsBundle = {
  campaignPerformance: { header: string[]; rows: Record<string, string>[] };
  adGroupPerformance: { header: string[]; rows: Record<string, string>[] };
  searchQueries: { header: string[]; rows: Record<string, string>[] };
  dateFrom: string;
  dateTo: string;
  warnings: string[];
};

export async function fetchAllDirectReports(
  accessToken: string,
  clientLogin: string | null,
  options?: { days?: number; namePrefix?: string }
): Promise<YandexDirectReportsBundle> {
  const days = Math.min(Math.max(options?.days ?? 90, 7), 365);
  const { dateFrom, dateTo } = reportDateRangeLastDays(days);
  const prefix = (options?.namePrefix ?? "Knopka").replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniq = `${prefix}_${Date.now()}`;
  const warnings: string[] = [];

  const run = async (label: string, builder: () => DirectReportParams) => {
    try {
      const { tsv } = await fetchDirectReportTsv(accessToken, builder(), clientLogin);
      return parseDirectReportTsv(tsv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`${label}: ${msg}`);
      return { header: [] as string[], rows: [] as Record<string, string>[] };
    }
  };

  /* Последовательно: у Директа лимиты очереди офлайн-отчётов; SEARCH_QUERY только offline. */
  const campaignPerformance = await run("Отчёт по кампаниям", () =>
    buildCampaignPerformanceReport(`${uniq}_camp`, dateFrom, dateTo)
  );
  const adGroupPerformance = await run("Отчёт по группам", () =>
    buildAdGroupPerformanceReport(`${uniq}_ag`, dateFrom, dateTo)
  );
  const searchQueries = await run("Поисковые запросы", () =>
    buildSearchQueryReport(`${uniq}_sq`, dateFrom, dateTo)
  );

  return {
    campaignPerformance,
    adGroupPerformance,
    searchQueries,
    dateFrom,
    dateTo,
    warnings,
  };
}
