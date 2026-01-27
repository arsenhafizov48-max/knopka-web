"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getReport } from "../../lib/reports/storage";
import type { ReportInstance } from "../../lib/reports/types";

import ExportButtons from "../../components/reports/ExportButtons";

import { buildSnapshot, deltaPercent, getPeriodRange } from "../../lib/data/compute";

function fmtInt(x: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(x);
}

function fmtMoney(x: number | null) {
  if (x === null) return "—";
  const v = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(x);
  return `${v} ₽`;
}

function fmtRate(x: number | null) {
  if (x === null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(x);
}

function fmtNumber(x: number | null, digits = 2) {
  if (x === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(x);
}

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  const d = deltaPercent(current, previous);
  if (d === null) return <span className="text-neutral-400">—</span>;

  const sign = d > 0 ? "+" : "";
  const text = `${sign}${new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(d)}`;

  const cls =
    d > 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : d < 0
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-neutral-50 text-neutral-700 border-neutral-200";

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${cls}`}>{text}</span>;
}

function KpiCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string;
  delta: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-600">{title}</div>
      <div className="mt-2 text-xl font-semibold text-neutral-900">{value}</div>
      <div className="mt-2">{delta}</div>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ reportId: string }>();
  const reportId = params?.reportId;

  const [report, setReport] = useState<ReportInstance | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    const r = getReport(reportId);
    setReport(r);
    setLoaded(true);
  }, [reportId]);

  const snapshot = useMemo(() => {
    if (!report) return null;
    const range = getPeriodRange({
      preset: "custom",
      customFrom: report.period.from,
      customTo: report.period.to,
    });
    return buildSnapshot(range);
  }, [report]);

  if (!loaded) return null;

  if (!reportId || !report) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="text-sm font-semibold">Отчёт не найден</div>
        <div className="mt-1 text-xs text-neutral-600">Возможно, он был удалён.</div>

        <Link
          href="/app/reports"
          className="mt-4 inline-flex rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50"
        >
          Вернуться к отчётам
        </Link>
      </div>
    );
  }

  if (!snapshot) return null;

  const cur = snapshot.current;
  const prev = snapshot.previous;

  const rows = [
    {
      label: "Показы",
      cur: fmtInt(cur.sum.impressions),
      prev: fmtInt(prev.sum.impressions),
      deltaCur: cur.sum.impressions,
      deltaPrev: prev.sum.impressions,
      kind: "int" as const,
    },
    {
      label: "Клики",
      cur: fmtInt(cur.sum.clicks),
      prev: fmtInt(prev.sum.clicks),
      deltaCur: cur.sum.clicks,
      deltaPrev: prev.sum.clicks,
      kind: "int" as const,
    },
    {
      label: "Заявки",
      cur: fmtInt(cur.sum.leads),
      prev: fmtInt(prev.sum.leads),
      deltaCur: cur.sum.leads,
      deltaPrev: prev.sum.leads,
      kind: "int" as const,
    },
    {
      label: "Квалифицированные заявки",
      cur: fmtInt(cur.sum.sql),
      prev: fmtInt(prev.sum.sql),
      deltaCur: cur.sum.sql,
      deltaPrev: prev.sum.sql,
      kind: "int" as const,
    },
    {
      label: "Продажи",
      cur: fmtInt(cur.sum.sales),
      prev: fmtInt(prev.sum.sales),
      deltaCur: cur.sum.sales,
      deltaPrev: prev.sum.sales,
      kind: "int" as const,
    },
    {
      label: "Расход",
      cur: fmtMoney(cur.sum.spend),
      prev: fmtMoney(prev.sum.spend),
      deltaCur: cur.sum.spend,
      deltaPrev: prev.sum.spend,
      kind: "money" as const,
    },
    {
      label: "Выручка",
      cur: fmtMoney(cur.sum.revenue),
      prev: fmtMoney(prev.sum.revenue),
      deltaCur: cur.sum.revenue,
      deltaPrev: prev.sum.revenue,
      kind: "money" as const,
    },
    {
      label: "Цена клика",
      cur: fmtMoney(cur.derived.cpc),
      prev: fmtMoney(prev.derived.cpc),
      deltaCur: cur.derived.cpc,
      deltaPrev: prev.derived.cpc,
      kind: "money" as const,
    },
    {
      label: "Цена заявки",
      cur: fmtMoney(cur.derived.cpl),
      prev: fmtMoney(prev.derived.cpl),
      deltaCur: cur.derived.cpl,
      deltaPrev: prev.derived.cpl,
      kind: "money" as const,
    },
    {
      label: "Конверсия клик → заявка",
      cur: fmtRate(cur.derived.crClickToLead),
      prev: fmtRate(prev.derived.crClickToLead),
      deltaCur: cur.derived.crClickToLead,
      deltaPrev: prev.derived.crClickToLead,
      kind: "rate" as const,
    },
    {
      label: "Конверсия заявка → продажа",
      cur: fmtRate(cur.derived.crLeadToSale),
      prev: fmtRate(prev.derived.crLeadToSale),
      deltaCur: cur.derived.crLeadToSale,
      deltaPrev: prev.derived.crLeadToSale,
      kind: "rate" as const,
    },
    {
      label: "Средний чек",
      cur: fmtMoney(cur.derived.aov),
      prev: fmtMoney(prev.derived.aov),
      deltaCur: cur.derived.aov,
      deltaPrev: prev.derived.aov,
      kind: "money" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Отчёт</h1>
          <div className="mt-1 text-sm text-neutral-600">{report.humanLabel}</div>
          <div className="mt-1 text-xs text-neutral-500">
            Текущий период: <span className="font-medium text-neutral-700">{snapshot.range.from} — {snapshot.range.to}</span>
            <span className="mx-2">•</span>
            Прошлый период: <span className="font-medium text-neutral-700">{snapshot.range.prevFrom} — {snapshot.range.prevTo}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/reports"
            className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50"
          >
            К списку
          </Link>
          <ExportButtons report={report} />
        </div>
      </div>

      {/* KPI плитки */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          title="Расход"
          value={fmtMoney(cur.sum.spend)}
          delta={<DeltaBadge current={cur.sum.spend} previous={prev.sum.spend} />}
        />
        <KpiCard
          title="Выручка"
          value={fmtMoney(cur.sum.revenue)}
          delta={<DeltaBadge current={cur.sum.revenue} previous={prev.sum.revenue} />}
        />
        <KpiCard
          title="Заявки"
          value={fmtInt(cur.sum.leads)}
          delta={<DeltaBadge current={cur.sum.leads} previous={prev.sum.leads} />}
        />
        <KpiCard
          title="Цена заявки"
          value={fmtMoney(cur.derived.cpl)}
          delta={<DeltaBadge current={cur.derived.cpl} previous={prev.derived.cpl} />}
        />
      </div>

      {/* Таблица */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-sm font-semibold text-neutral-900">Таблица показателей</div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.4fr] bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-600">
            <div>Показатель</div>
            <div>Текущий</div>
            <div>Прошлый</div>
            <div>Разница</div>
          </div>

          <div className="divide-y divide-neutral-200">
            {rows.map((r) => (
              <div
                key={r.label}
                className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.4fr] items-center px-4 py-3 text-sm"
              >
                <div className="text-neutral-900">{r.label}</div>
                <div className="text-neutral-900">{r.cur}</div>
                <div className="text-neutral-700">{r.prev}</div>
                <div>
                  <DeltaBadge current={r.deltaCur as any} previous={r.deltaPrev as any} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Если показатель не считается (деление на 0), показываем “—”.
        </div>
      </div>
    </div>
  );
}
