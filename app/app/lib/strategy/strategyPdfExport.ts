import { PDFDocument, rgb, type PDFFont } from "pdf-lib";

import type { StrategyDocument } from "@/app/app/lib/strategy/types";

const NOTO_TTF =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const tryLine = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(tryLine, size);
    if (width <= maxWidth || !cur) {
      cur = tryLine;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function wrapParagraph(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paras = text.split(/\n+/);
  const out: string[] = [];
  for (const p of paras) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    for (const line of wrapLine(trimmed, font, size, maxWidth)) {
      out.push(line);
    }
  }
  return out.length ? out : [""];
}

/** Скачивание стратегии как PDF (не конвертация из Excel). */
export async function downloadStrategyDocumentPdf(doc: StrategyDocument, filename = "strategiya-knopka.pdf") {
  let fontBytes: Uint8Array;
  try {
    const res = await fetch(NOTO_TTF);
    if (!res.ok) throw new Error(String(res.status));
    fontBytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    throw new Error("Не удалось загрузить шрифт для PDF. Проверьте сеть и повторите.");
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(fontBytes);

  const pageW = 595;
  const pageH = 842;
  const margin = 48;
  const maxW = pageW - margin * 2;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;
  const titleSize = 14;
  const bodySize = 10;
  const lineH = bodySize * 1.35;
  const sectionGap = 8;

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const draw = (text: string, size: number) => {
    const lines = wrapParagraph(text, font, size, maxW);
    for (const line of lines) {
      ensureSpace(lineH + 2);
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font,
        color: rgb(0.12, 0.12, 0.14),
      });
      y -= lineH;
    }
  };

  draw("Стратегия маркетинга (КНОПКА)", titleSize);
  y -= sectionGap;
  draw(
    `Сформировано: ${new Date(doc.generatedAt).toLocaleString("ru-RU")}. Фактура: ${doc.factSnapshotUpdatedAt.slice(0, 10)}.`,
    bodySize - 0.5
  );
  y -= sectionGap * 2;

  for (const sec of doc.sections) {
    ensureSpace(titleSize + lineH * 3);
    draw(sec.title, titleSize);
    y -= 4;

    for (const p of sec.paragraphs) {
      draw(p, bodySize);
    }

    if (sec.tables?.length) {
      for (const tb of sec.tables) {
        draw(tb.title, bodySize + 1);
        for (const row of tb.rows) {
          const rowText = tb.columns.map((c, i) => `${c}: ${row[i] ?? ""}`).join(" · ");
          draw(rowText, bodySize - 0.5);
        }
      }
    }

    if (sec.bullets?.length) {
      for (const b of sec.bullets) {
        draw(`• ${b}`, bodySize);
      }
    }

    y -= sectionGap;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
