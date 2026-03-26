"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FileDown, FileText } from "lucide-react";

import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { clearStrategy, loadStrategy } from "@/app/app/lib/strategy/storage";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";
import { StrategyCompetitorAnalysis } from "@/app/app/components/StrategyCompetitorAnalysis";
import { StrategyGigaChat } from "@/app/app/components/StrategyGigaChat";
import { StrategyWordstatDemand } from "@/app/app/components/StrategyWordstatDemand";
import { downloadStrategyDocumentPdf } from "@/app/app/lib/strategy/strategyPdfExport";

export default function StrategyPage() {
  const [fact, setFact] = useState<ProjectFact | null>(null);
  const [doc, setDoc] = useState<StrategyDocument | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const refresh = useCallback(() => {
    setFact(loadProjectFact());
    setDoc(loadStrategy());
  }, []);

  useEffect(() => {
    refresh();
    const onFact = () => refresh();
    const onStr = () => setDoc(loadStrategy());
    window.addEventListener("knopka:projectFactUpdated", onFact);
    window.addEventListener("knopka:strategyUpdated", onStr);
    return () => {
      window.removeEventListener("knopka:projectFactUpdated", onFact);
      window.removeEventListener("knopka:strategyUpdated", onStr);
    };
  }, [refresh]);

  const gaps = useMemo(() => (fact ? getStrategyGaps(fact) : { ok: false, items: [] }), [fact]);

  const onClear = () => {
    clearStrategy();
    setDoc(null);
  };

  if (!fact) {
    return (
      <div className="py-10 text-center text-sm text-neutral-500">Загрузка…</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Стратегия маркетинга</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Карманный маркетолог КНОПКИ собирает этот документ из вашей фактуры. Мы не
            придумываем цифры: если данных не хватает, просим заполнить их — и только
            потом формируем структуру.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/fact"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            <FileText className="h-4 w-4" />
            Фактура бизнеса
          </Link>
          <Link
            href="/app/strategy/history"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            История анализов
          </Link>
        </div>
      </div>

      <StrategyGigaChat doc={doc} fact={fact} setDoc={setDoc} gapsOk={gaps.ok} />

      {!gaps.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="text-sm font-semibold text-amber-950">
                Недостаточно данных для честной стратегии
              </div>
              <p className="mt-1 text-sm text-amber-900/80">
                Заполните пункты ниже — без этого КНОПКА не будет заполнять пробелы
                выдуманными цифрами.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {gaps.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="font-medium text-amber-950 underline decoration-amber-400/60 underline-offset-2 hover:decoration-amber-700"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {doc ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span>
              Документ обновлён:{" "}
              {new Date(doc.generatedAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span>Фактура на момент сборки: {doc.factSnapshotUpdatedAt.slice(0, 10)}</span>
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Удалить документ
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={async () => {
                  setPdfBusy(true);
                  try {
                    await downloadStrategyDocumentPdf(doc, "strategiya-knopka.pdf");
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Ошибка PDF";
                    window.alert(msg);
                  } finally {
                    setPdfBusy(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                {pdfBusy ? "PDF…" : "Скачать PDF"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {doc.sections.map((sec) => (
              <details
                key={sec.id}
                className="group rounded-2xl border border-neutral-200 bg-white open:shadow-sm"
                open={sec.id === "goal"}
              >
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-neutral-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {sec.title}
                    <span className="text-xs font-normal text-neutral-400 group-open:hidden">
                      Развернуть
                    </span>
                    <span className="hidden text-xs font-normal text-neutral-400 group-open:inline">
                      Свернуть
                    </span>
                  </span>
                </summary>
                <div className="border-t border-neutral-100 px-5 pb-5 pt-3">
                  {(() => {
                    const tablesLeadFirst =
                      (sec.tables?.length ?? 0) > 0 && sec.paragraphs.length > 0;
                    const lead = tablesLeadFirst ? sec.paragraphs[0] : null;
                    const bodyParas = tablesLeadFirst ? sec.paragraphs.slice(1) : sec.paragraphs;
                    return (
                      <>
                        {lead ? (
                          <p className="text-sm leading-relaxed text-neutral-700">{lead}</p>
                        ) : null}
                        {sec.tables && sec.tables.length > 0 ? (
                          <div className={lead ? "mt-4 space-y-5" : "space-y-5"}>
                            {sec.tables.map((tb, ti) => (
                              <div key={ti} className="overflow-x-auto">
                                <div className="mb-2 text-xs font-semibold text-neutral-800">{tb.title}</div>
                                <table className="w-full min-w-[320px] border-collapse text-xs text-neutral-800">
                                  <thead>
                                    <tr>
                                      {tb.columns.map((c, ci) => (
                                        <th
                                          key={ci}
                                          className="border border-neutral-200 bg-neutral-50 px-2 py-2 text-left font-medium"
                                        >
                                          {c}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tb.rows.map((row, ri) => (
                                      <tr key={ri}>
                                        {row.map((cell, ci) => (
                                          <td
                                            key={ci}
                                            className="border border-neutral-200 px-2 py-2 align-top text-neutral-700"
                                          >
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div
                          className={
                            lead || (sec.tables?.length ?? 0) > 0
                              ? "mt-4 space-y-3 text-sm text-neutral-700"
                              : "space-y-3 text-sm text-neutral-700"
                          }
                        >
                          {bodyParas.map((p, i) => (
                            <p key={i} className="leading-relaxed">
                              {p}
                            </p>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  {sec.bullets && sec.bullets.length > 0 ? (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
                      {sec.bullets.map((b, i) => (
                        <li key={i} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </details>
            ))}
          </div>

        </div>
      ) : gaps.ok ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center text-sm text-neutral-600">
          Документ стратегии ещё не собран. В блоке чата выше нажмите «Собрать стратегию из фактуры» — появятся разделы
          1–9; при необходимости затем запустите анализ спроса и конкурентов там же.
        </div>
      ) : null}

      <details className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-4 text-sm text-neutral-600">
        <summary className="cursor-pointer font-medium text-neutral-700">
          Проверка API (отладка): отдельные формы Вордстата и конкурентов
        </summary>
        <div className="mt-4 space-y-4">
          <StrategyWordstatDemand fact={fact} doc={doc} setDoc={setDoc} gapsOk={gaps.ok} />
          <StrategyCompetitorAnalysis fact={fact} doc={doc} setDoc={setDoc} gapsOk={gaps.ok} />
        </div>
      </details>
    </div>
  );
}
