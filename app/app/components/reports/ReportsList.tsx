"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listReports } from "../../lib/reports/storage";
import type { ReportInstance } from "../../lib/reports/types";

export default function ReportsList() {
  const [items, setItems] = useState<ReportInstance[]>([]);

  useEffect(() => {
    setItems(listReports());
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Сформированные отчёты</div>
        <div className="text-xs text-neutral-500">История</div>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-xs text-neutral-500">Пока пусто. Нажми “Сформировать”.</div>
        ) : (
          items.map((r) => (
            <Link
              key={r.reportId}
              href={`/app/reports/${r.reportId}`}
              className="block rounded-xl border border-neutral-200 bg-white p-3 hover:bg-neutral-50"
            >
              <div className="text-sm font-medium">{r.humanLabel}</div>
              <div className="mt-1 text-xs text-neutral-500">{r.period.label}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
