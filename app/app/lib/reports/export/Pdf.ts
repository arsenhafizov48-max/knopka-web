import type { ReportInstance } from "../types";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPdf(report: ReportInstance) {
  if (typeof window === "undefined") return;

  const res = await fetch("/api/reports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });

  if (!res.ok) throw new Error("PDF export failed");

  const blob = await res.blob();
  downloadBlob(`report-${report.reportId}.pdf`, blob);
}
