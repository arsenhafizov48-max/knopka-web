"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, FileText } from "lucide-react";

import { buildPeriodReportDocument } from "@/app/app/lib/data/periodReportDoc";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type Tab = "week" | "month";

export default function ReportsPeriodOverview() {
  const [tab, setTab] = useState<Tab>("week");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("knopka:dailyDataUpdated", on);
    return () => window.removeEventListener("knopka:dailyDataUpdated", on);
  }, [refresh]);

  const doc = useMemo(() => {
    void tick;
    return buildPeriodReportDocument(tab, todayISO());
  }, [tab, tick]);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
            <FileText className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Отчёт по введённым данным
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              Считается из ежедневного ввода в разделе «Данные». Сравнение — с
              предыдущим периодом той же длины.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => setTab("week")}
            className={
              tab === "week"
                ? "rounded-xl bg-white px-4 py-2 text-xs font-medium text-neutral-900 shadow-sm"
                : "rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            }
          >
            Неделя
          </button>
          <button
            type="button"
            onClick={() => setTab("month")}
            className={
              tab === "month"
                ? "rounded-xl bg-white px-4 py-2 text-xs font-medium text-neutral-900 shadow-sm"
                : "rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            }
          >
            Месяц
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <CalendarRange className="h-3.5 w-3.5" />
        <span>{doc.periodTitle}</span>
        <span className="text-neutral-300">·</span>
        <span>{doc.compareNote}</span>
      </div>

      <div
        className={
          doc.kind === "month"
            ? "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {doc.kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
            <div className="text-xs text-neutral-500">{k.label}</div>
            <div className="mt-1 text-lg font-semibold text-neutral-900">{k.value}</div>
            {k.hint ? <div className="mt-1 text-xs text-neutral-500">{k.hint}</div> : null}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {doc.sections.map((sec) => (
          <div key={sec.heading}>
            <h3 className="text-sm font-semibold text-neutral-900">{sec.heading}</h3>
            <ul className="mt-2 space-y-2 text-sm text-neutral-700">
              {sec.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
