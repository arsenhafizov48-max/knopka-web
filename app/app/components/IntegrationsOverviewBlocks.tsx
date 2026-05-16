"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Megaphone, Store } from "lucide-react";

import type { IntegrationCard } from "@/app/lib/integrationsContext";
import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";

type OverviewResponse = {
  authenticated?: boolean;
  blockForAi?: string;
  cards?: IntegrationCard[];
};

function sourceIcon(source: IntegrationCard["source"]) {
  if (source === "metrika") return <BarChart3 className="h-4 w-4" />;
  if (source === "avito") return <Store className="h-4 w-4" />;
  return <Megaphone className="h-4 w-4" />;
}

function toneBorder(tone: IntegrationCard["tone"]) {
  if (tone === "ok") return "border-green-200 bg-green-50/40";
  if (tone === "bad") return "border-rose-200 bg-rose-50/40";
  if (tone === "warn") return "border-amber-200 bg-amber-50/40";
  return "border-neutral-200 bg-neutral-50/40";
}

function toneBadge(tone: IntegrationCard["tone"]) {
  if (tone === "ok") return "bg-green-100 text-green-800";
  if (tone === "bad") return "bg-rose-100 text-rose-800";
  if (tone === "warn") return "bg-amber-100 text-amber-900";
  return "bg-neutral-100 text-neutral-700";
}

const CARD_ORDER: Record<IntegrationCard["source"], number> = { metrika: 0, direct: 1, avito: 2 };

export function IntegrationsOverviewBlocks({
  title = "Данные из подключений",
  description = "Метрика, Директ и Авито — сводка для отчётов и GigaChat. Настройка в «Системы и данные».",
  showAiBlock = true,
  compact = false,
}: {
  title?: string;
  description?: string;
  showAiBlock?: boolean;
  compact?: boolean;
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(resolveSameOriginApiUrl("/api/integrations/overview"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as OverviewResponse;
        if (!res.ok) {
          setErr("Не удалось загрузить сводку");
          return;
        }
        setData(j);
        setErr(null);
      })
      .catch(() => setErr("Сеть"));
  }, []);

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener("knopka:integrationsRefresh", on);
    return () => window.removeEventListener("knopka:integrationsRefresh", on);
  }, [load]);

  if (!data?.authenticated) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-neutral-600">Войдите в аккаунт, чтобы видеть данные интеграций.</p>
        <Link href={withBasePath("/login")} className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          Войти
        </Link>
      </section>
    );
  }

  const sorted = [...(data.cards ?? [])].sort((a, b) => CARD_ORDER[a.source] - CARD_ORDER[b.source]);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <OverviewHeader title={title} description={description} compact={compact} />

      {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}

      <OverviewGrid compact={compact}>
        {sorted.map((card) => (
          <article key={card.id} className={`rounded-xl border p-4 ${toneBorder(card.tone)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span className="text-neutral-600">{sourceIcon(card.source)}</span>
                {card.title}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${toneBadge(card.tone)}`}>
                {card.statusText}
              </span>
            </div>
            {card.errorMessage ? (
              <p className="mt-2 text-xs text-rose-700">{card.errorMessage}</p>
            ) : null}
            {card.metrics.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {card.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-white/80 bg-white/70 px-2 py-1.5">
                    <MetricLabel label={m.label} />
                    <div className="text-sm font-semibold text-neutral-900">{m.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {card.bullets.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                {card.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
              {card.dataHref ? (
                <Link href={withBasePath(card.dataHref)} className="text-blue-600 hover:text-blue-700">
                  Открыть данные →
                </Link>
              ) : null}
              <Link href={withBasePath(card.systemsHref)} className="text-neutral-600 hover:text-neutral-800">
                Настроить
              </Link>
            </div>
          </article>
        ))}
      </OverviewGrid>

      {showAiBlock && data.blockForAi ? (
        <details className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <summary className="cursor-pointer font-medium text-neutral-800">
            Что видит GigaChat (сводка для анализа)
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {data.blockForAi}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function OverviewHeader({
  title,
  description,
  compact,
}: {
  title: string;
  description: string;
  compact: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-2 ${compact ? "" : "mb-1"}`}>
      <div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {!compact ? <p className="mt-1 text-xs text-neutral-600">{description}</p> : null}
      </div>
      <Link
        href={withBasePath("/app/integration-data")}
        className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        Все данные →
      </Link>
    </div>
  );
}

function OverviewGrid({ children, compact }: { children: React.ReactNode; compact: boolean }) {
  return <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "lg:grid-cols-3"}`}>{children}</div>;
}

function MetricLabel({ label }: { label: string }) {
  return <div className="text-[10px] text-neutral-500">{label}</div>;
}
