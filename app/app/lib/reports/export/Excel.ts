import type { ReportInstance } from "../types";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(v: unknown) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export async function exportCsv(report: ReportInstance) {
  if (typeof window === "undefined") return;

  const rows: Array<Array<unknown>> = [
    ["ID отчёта", report.reportId],
    ["Шаблон", report.templateId],
    ["Создан", report.createdAt],
    ["Период от", report.period.from],
    ["Период до", report.period.to],
    ["Название", report.humanLabel],
    ["Каналы", report.selectedChannels?.join(", ") ?? ""],
    ["Показатели", report.selectedMetrics?.join(", ") ?? ""],
  ];

  // BOM, чтобы Excel корректно понимал UTF-8
  const bom = "\uFEFF";
  const csv = bom + rows.map((r) => r.map(esc).join(";")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(`report-${report.reportId}.csv`, blob);
}
