import { NextRequest } from "next/server";
import type { ReportInstance } from "@/app/app/lib/reports/types";

export const runtime = "nodejs";

function pdfEscape(s: string) {
  return s
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]) {
  // A4: 595 x 842
  const fontSize = 12;
  const startX = 50;
  const startY = 800;
  const lineH = 18;

  const content =
    "BT\n" +
    `/F1 ${fontSize} Tf\n` +
    lines
      .map((line, i) => {
        const y = startY - i * lineH;
        return `${startX} ${y} Td (${pdfEscape(line)}) Tj\n`;
      })
      .join("") +
    "ET\n";

  const enc = new TextEncoder();
  const contentBytes = enc.encode(content);

  const objects: string[] = [];

  objects.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);

  objects.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);

  objects.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]
   /Resources << /Font << /F1 4 0 R >> >>
   /Contents 5 0 R
>>
endobj`);

  objects.push(`4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);

  objects.push(`5 0 obj
<< /Length ${contentBytes.length} >>
stream
${content}
endstream
endobj`);

  // Собираем файл и xref
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0]; // xref требует нулевой объект

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefStart = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f \n`;

  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefStart}
%%EOF`;

  return enc.encode(pdf);
}

export async function POST(req: NextRequest) {
  const report = (await req.json()) as ReportInstance;

  const lines: string[] = [
    "КНОПКА — отчёт",
    report.humanLabel || "Отчёт",
    `Период: ${report.period?.from ?? "—"} — ${report.period?.to ?? "—"}`,
    "",
    `Каналы: ${(report.selectedChannels ?? []).join(", ") || "—"}`,
    `Показатели: ${(report.selectedMetrics ?? []).join(", ") || "—"}`,
  ];

  const pdfBytes = buildSimplePdf(lines);

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${report.reportId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
