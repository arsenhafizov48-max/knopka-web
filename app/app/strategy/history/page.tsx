"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

type RunRow = {
  id: string;
  created_at: string;
  geo: string;
  niche: string;
};

export default function StrategyHistoryPage() {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dbMissing, setDbMissing] = useState(false);
  const [dbWarning, setDbWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = resolveSameOriginApiUrl("/api/strategy/competitor-runs");
        const res = await fetch(url, { credentials: "same-origin" });
        const raw = await res.text();
        let data: { runs?: RunRow[]; error?: string; dbMissing?: boolean; warning?: string };
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          if (!cancelled) setErr("Некорректный ответ сервера");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setErr(data.error || `Ошибка ${res.status}`);
          return;
        }
        if (data.dbMissing) {
          if (!cancelled) {
            setDbMissing(true);
            setDbWarning(data.warning ?? null);
            setRuns([]);
          }
          return;
        }
        if (!cancelled) {
          setDbMissing(false);
          setDbWarning(null);
          setRuns(data.runs ?? []);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/app/strategy"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          К стратегии
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">История анализов конкурентов</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Сохранённые запуски GigaChat: таблицы «Сайты», «Яндекс.Карты», «2ГИС». Документ стратегии по-прежнему
          хранится в браузере — скачайте PDF на странице стратегии, чтобы не потерять.
        </p>
      </div>

      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {dbMissing && dbWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {dbWarning}
        </div>
      ) : null}

      {runs === null ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Пока нет сохранённых анализов в облаке. Новый анализ — в чате на странице{" "}
          <Link href="/app/strategy" className="font-medium text-violet-700 underline underline-offset-2">
            Стратегия
          </Link>{" "}
          (кнопка «Анализ конкурентов»).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Ниша</th>
                <th className="px-4 py-3">География</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-800">
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.niche || "—"}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.geo || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/strategy/history/${r.id}`}
                      className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
