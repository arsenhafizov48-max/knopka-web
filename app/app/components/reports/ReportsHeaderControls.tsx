"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Sparkles } from "lucide-react";

function fmtDate(d: string) {
  // ожидаем YYYY-MM-DD
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

export default function ReportsHeaderControls() {
  const sp = useSearchParams();

  const label = useMemo(() => {
    const from = sp?.get("from") || "2026-01-01";
    const to = sp?.get("to") || "2026-01-31";
    return `${fmtDate(from)} — ${fmtDate(to)}`;
  }, [sp]);

  return (
    <div className="flex items-center gap-2">
      <a
        href="#report-builder"
        className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 md:flex"
      >
        <CalendarDays className="h-4 w-4 text-neutral-500" />
        <span>Период:</span>
        <span className="font-medium">{label}</span>
      </a>

      <a
        href="#report-builder"
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
      >
        <Sparkles className="h-4 w-4" />
        Сформировать отчёт
      </a>
    </div>
  );
}
