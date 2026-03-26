"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Megaphone } from "lucide-react";

import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";

type Summary = {
  authenticated?: boolean;
  blockForAi?: string;
  direct?: { connected?: boolean };
  metrika?: { connected?: boolean; counters?: number };
};

export default function ReportsIntegrationsSnapshot() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(resolveSameOriginApiUrl("/api/integrations/summary"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as Summary;
        if (!res.ok) {
          setErr("Не удалось загрузить сводку интеграций");
          return;
        }
        setData(j);
        setErr(null);
      })
      .catch(() => setErr("Сеть"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data?.authenticated) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">Данные из Яндекса</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Войдите в аккаунт — чтобы видеть статус Директа и Метрики в отчётах.
        </p>
        <Link
          href={withBasePath("/login")}
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Войти
        </Link>
      </section>
    );
  }

  const d = data.direct?.connected;
  const m = data.metrika?.connected;
  const mc = data.metrika?.counters ?? 0;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold">Данные из подключений</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Отдельно по Директу и по Метрике — для сверки с ручным вводом в «Данные».
      </p>

      {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
            <Megaphone className="h-4 w-4 text-neutral-600" />
            Яндекс Директ
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            {d ? "Подключено — структура и снимок доступны в «Системы и данные»." : "Не подключено."}
          </p>
          <Link
            href={withBasePath("/app/systems")}
            className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Настроить →
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
            <BarChart3 className="h-4 w-4 text-neutral-600" />
            Яндекс Метрика
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            {m
              ? mc > 0
                ? `Подключено, счётчиков: ${mc}. Показатели за период — в сводке для ИИ.`
                : "OAuth есть — добавьте номер счётчика в «Системы и данные»."
              : "Не подключено."}
          </p>
          <Link
            href={withBasePath("/app/systems")}
            className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Настроить →
          </Link>
        </div>
      </div>

      {data.blockForAi ? (
        <details className="mt-4 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
          <summary className="cursor-pointer font-medium text-neutral-800">Текст для ИИ (сводка)</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {data.blockForAi}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
