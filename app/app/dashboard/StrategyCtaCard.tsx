"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Sparkles } from "lucide-react";

import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";

export default function StrategyCtaCard() {
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());
  const [strategyPresent, setStrategyPresent] = useState(() =>
    typeof window !== "undefined" ? Boolean(loadStrategy()) : false
  );

  useEffect(() => {
    const onFact = () => setFact(loadProjectFact());
    window.addEventListener("knopka:projectFactUpdated", onFact);
    return () => window.removeEventListener("knopka:projectFactUpdated", onFact);
  }, []);

  useEffect(() => {
    const onStr = () => setStrategyPresent(Boolean(loadStrategy()));
    window.addEventListener("knopka:strategyUpdated", onStr);
    return () => window.removeEventListener("knopka:strategyUpdated", onStr);
  }, []);

  const gaps = useMemo(() => getStrategyGaps(fact), [fact]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-[#F4F7FF] to-white p-5 shadow-[0_1px_0_rgba(16,24,40,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
            <Sparkles className="h-5 w-5 text-neutral-800" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900">Стратегия маркетинга</div>
            <p className="mt-1 text-sm text-neutral-600">
              {gaps.ok
                ? strategyPresent
                  ? "Документ сохранён — можно обновить из актуальной фактуры."
                  : "Фактура достаточно заполнена — сгенерируйте черновик стратегии."
                : `Не хватает данных для честной стратегии (${gaps.items.length} пунктов).`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link
            href="/app/fact"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            <FileText className="h-3.5 w-3.5" />
            Фактура
          </Link>
          <Link
            href="/app/strategy"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            {gaps.ok ? (strategyPresent ? "Открыть стратегию" : "Собрать стратегию") : "Заполнить пробелы"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
