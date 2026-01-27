import type { ReportInstance } from "./types";

const KEY = "knopka.reports.v1";

function safeParse(json: string | null): any {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function readAll(): ReportInstance[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? (parsed as ReportInstance[]) : [];
}

function writeAll(items: ReportInstance[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function saveReport(report: ReportInstance) {
  const all = readAll();
  const next = [report, ...all].slice(0, 100); // лимит, чтобы не раздувать
  writeAll(next);
}

export function listReports(): ReportInstance[] {
  return readAll();
}

export function getReport(reportId: string): ReportInstance | null {
  const all = readAll();
  return all.find((r) => r.reportId === reportId) ?? null;
}

export function deleteReport(reportId: string) {
  const all = readAll();
  writeAll(all.filter((r) => r.reportId !== reportId));
}
