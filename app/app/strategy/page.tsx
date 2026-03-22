"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FileText, RefreshCw, Sparkles } from "lucide-react";

import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { buildStrategyDocument } from "@/app/app/lib/strategy/buildFromFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import {
  clearStrategy,
  loadStrategy,
  saveStrategy,
} from "@/app/app/lib/strategy/storage";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";
import { StrategyGigaChat } from "@/app/app/components/StrategyGigaChat";

export default function StrategyPage() {
  const [fact, setFact] = useState<ProjectFact | null>(null);
  const [doc, setDoc] = useState<StrategyDocument | null>(null);
  const [busy, setBusy] = useState(false);

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

  const onGenerate = () => {
    if (!fact || !gaps.ok) return;
    setBusy(true);
    try {
      const next = buildStrategyDocument(fact);
      saveStrategy(next);
      setDoc(next);
    } finally {
      setBusy(false);
    }
  };

  const onRegenerate = () => {
    if (!fact || !gaps.ok) return;
    setBusy(true);
    try {
      const next = buildStrategyDocument(fact);
      saveStrategy(next);
      setDoc(next);
    } finally {
      setBusy(false);
    }
  };

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
        <Link
          href="/app/fact"
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          <FileText className="h-4 w-4" />
          Фактура бизнеса
        </Link>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5 ring-1 ring-violet-100">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900">
              Создать стратегию для бизнеса
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              Нажмите кнопку ниже, когда все обязательные поля заполнены. Документ можно
              пересобрать после обновления фактуры.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!gaps.ok || busy}
                onClick={doc ? onRegenerate : onGenerate}
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                {doc ? "Пересобрать из фактуры" : "Сформировать стратегию"}
              </button>
              {doc ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Удалить документ
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <StrategyGigaChat doc={doc} />

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
            <span>Фактура на момент сборки: {doc.factSnapshotUpdatedAt.slice(0, 10)}</span>
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
                  <div className="space-y-3 text-sm text-neutral-700">
                    {sec.paragraphs.map((p, i) => (
                      <p key={i} className="leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
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
          Стратегия ещё не сформирована. Нажмите «Сформировать стратегию» — появится
          структурированный документ из семи разделов.
        </div>
      ) : null}
    </div>
  );
}
