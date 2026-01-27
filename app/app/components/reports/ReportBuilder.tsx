"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { saveReport } from "../../lib/reports/storage";
import { REPORT_TEMPLATES } from "../../lib/reports/templates";
import type { ReportInstance } from "../../lib/reports/types";

function uid() {
  // @ts-ignore
  return (globalThis.crypto?.randomUUID?.() as string) ?? `${Date.now()}-${Math.random()}`;
}

export default function ReportBuilder() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initial = useMemo(() => {
    const qsTemplate = sp?.get("template") || "";
    const qsFrom = sp?.get("from") || "";
    const qsTo = sp?.get("to") || "";

    const fallbackTemplate = (REPORT_TEMPLATES?.[0]?.templateId as string) ?? "business_summary";
    return {
      templateId: qsTemplate || fallbackTemplate,
      from: qsFrom || "2026-01-01",
      to: qsTo || "2026-01-31",
    };
  }, [sp]);

  const [templateId, setTemplateId] = useState(initial.templateId);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  // синхроним конструктор с URL → чтобы верхний "Период" был живой
  useEffect(() => {
    const p = new URLSearchParams(sp?.toString());
    p.set("from", from);
    p.set("to", to);
    p.set("template", templateId);
    router.replace(`${pathname}?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, templateId]);

  function handleBuild() {
    const reportId = uid();
    const createdAt = new Date().toISOString();

    const instance: ReportInstance = {
      reportId,
      templateId,
      createdAt,
      period: { kind: "custom", from, to, label: `${from} → ${to}` },
      selectedChannels: [],
      selectedMetrics: [],
      humanLabel: `Отчёт — ${from} → ${to} (создан ${new Date().toLocaleDateString("ru-RU")})`,
      dataSnapshot: {
        kpis: [],
        insights: [],
        risks: [],
        priorities: [],
        meta: { channels: [], metrics: [] },
      },
    };

    saveReport(instance);
    router.push(`/app/reports/${reportId}`);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Сформировать отчёт</div>
        <div className="text-xs text-neutral-500">Период и шаблон</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="text-xs text-neutral-600">Тип отчёта</div>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            {REPORT_TEMPLATES.map((t) => (
              <option key={t.templateId} value={t.templateId}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-neutral-600">С</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="text-xs text-neutral-600">По</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">Сформируем отчёт и сохраним его в истории.</div>
        <button
          type="button"
          onClick={handleBuild}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Сформировать
        </button>
      </div>
    </div>
  );
}
