"use client";

import { useEffect, useRef, useState } from "react";
import { exportPdf } from "../../lib/reports/export/Pdf";
import { exportCsv } from "../../lib/reports/export/Excel";
import type { ReportInstance } from "../../lib/reports/types";

export default function ExportButtons({ report }: { report: ReportInstance }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function onPdf() {
    try {
      setLoading("pdf");
      setOpen(false);
      await exportPdf(report);
    } finally {
      setLoading(null);
    }
  }

  async function onCsv() {
    try {
      setLoading("csv");
      setOpen(false);
      await exportCsv(report);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
      >
        {loading ? "Экспорт…" : "Экспорт"}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={onCsv}
            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50"
          >
            Таблица (CSV)
          </button>
          <button
            type="button"
            onClick={onPdf}
            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50"
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
