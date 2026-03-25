"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

import type { ProjectFact } from "@/app/app/lib/projectFact";
import { buildStrategyDocument } from "@/app/app/lib/strategy/buildFromFact";
import { applyWordstatMarketSection } from "@/app/app/lib/strategy/applyWordstatMarket";
import { saveStrategy } from "@/app/app/lib/strategy/storage";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";
import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

type Props = {
  fact: ProjectFact;
  doc: StrategyDocument | null;
  setDoc: (d: StrategyDocument) => void;
  gapsOk: boolean;
};

export function StrategyWordstatDemand({ fact, doc, setDoc, gapsOk }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const apiUrl = resolveSameOriginApiUrl("/api/strategy/wordstat-demand");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact }),
        credentials: "same-origin",
      });
      const rawText = await res.text();
      let data: {
        error?: string;
        market?: {
          paragraphs: string[];
          bullets: string[];
          tables?: { title: string; columns: string[]; rows: string[][] }[];
        };
        regionLabel?: string;
        phrases?: { requested: number };
        estimate?: { potentialRevenueRub: number | null };
      };
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        const isHtml =
          rawText.trimStart().startsWith("<!") || rawText.trimStart().toLowerCase().startsWith("<html");
        if (isHtml) {
          setErr(
            `Ответ не JSON (код ${res.status}), запрос шёл на: ${apiUrl}. ` +
              `Если в адресе сайта есть префикс после домена (например /кнопка), в Vercel в Environment Variables добавьте NEXT_PUBLIC_BASE_PATH ровно с этим префиксом и сделайте Redeploy — без этого Next не вешает /api на этот путь.`
          );
        } else {
          setErr(rawText.slice(0, 220));
        }
        return;
      }
      if (!res.ok) {
        setErr(data.error || `Ошибка ${res.status}`);
        return;
      }
      if (!data.market?.paragraphs?.length) {
        setErr("Пустой ответ сервера");
        return;
      }
      const base = doc ?? buildStrategyDocument(fact);
      const next = applyWordstatMarketSection(base, {
        paragraphs: data.market.paragraphs,
        bullets: data.market.bullets ?? [],
        tables: data.market.tables,
      });
      saveStrategy(next);
      setDoc(next);
      window.dispatchEvent(new Event("knopka:strategyUpdated"));
      const rev =
        data.estimate?.potentialRevenueRub != null
          ? ` Оценка выручки/мес: ${new Intl.NumberFormat("ru-RU").format(data.estimate.potentialRevenueRub)} ₽.`
          : "";
      setOk(
        `Раздел обновлён: ${data.regionLabel ?? "гео"}, ${data.phrases?.requested ?? "—"} фраз в одном запросе Вордстата.${rev}`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white p-5 ring-1 ring-sky-100">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-900">Анализ спроса (Яндекс.Вордстат)</div>
          <p className="mt-1 text-sm text-neutral-600">
            ИИ подбирает ровно 10 целевых и 30 общих запросов по нише и доп. услугам из фактуры; в тексте фраз
            города нет — регион задаётся как в Вордстате (фильтр), чтобы не занижать спрос. Дальше — расчёт
            конверсии и выручки по среднему чеку из фактуры.
          </p>
          <button
            type="button"
            disabled={!gapsOk || loading}
            onClick={() => void run()}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-sky-300/80 bg-white px-4 py-2.5 text-sm font-medium text-sky-950 shadow-sm hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Запрос к Вордстату…" : doc ? "Обновить раздел 2 по Вордстату" : "Собрать раздел 2 по Вордстату"}
          </button>
          {!gapsOk ? (
            <p className="mt-2 text-xs text-neutral-500">
              Заполните обязательные поля фактуры — без ниши и гео анализ не запускаем.
            </p>
          ) : null}
          {err ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
          ) : null}
          {ok ? (
            <p className="mt-3 rounded-xl bg-emerald-50/90 px-3 py-2 text-xs text-emerald-950">{ok}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
