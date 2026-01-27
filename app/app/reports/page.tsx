// app/app/reports/page.tsx
import type { ReactNode } from "react";

import ReportBuilder from "../components/reports/ReportBuilder";
import ReportsList from "../components/reports/ReportsList";
import ReportsHeaderControls from "../components/reports/ReportsHeaderControls";

import {
  TrendingUp,
  Users,
  CircleDollarSign,
  Target,
  AlertTriangle,
} from "lucide-react";

function MiniKpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "bad" | "info" }) {
  const cls =
    tone === "ok"
      ? "bg-green-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-rose-500"
          : "bg-blue-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

export default function Page() {
  const aiSummary = [
    "Подключите источники в «Системы и данные», чтобы отчёты считались по реальным цифрам.",
    "Цель отчётов: связать каналы → лиды → сделки → деньги.",
    "После подключения источников появятся авто-выводы, риски и приоритеты по периодам.",
  ];

  const aiAlerts = [
    {
      tone: "warn" as const,
      title: "Не подключена органика",
      text: "Добавьте Search Console, иначе часть SEO остаётся без данных.",
    },
    {
      tone: "warn" as const,
      title: "Офлайн-выручка вручную",
      text: "Зафиксируйте выручку и маржу, чтобы видеть прибыль и ROMI.",
    },
    {
      tone: "bad" as const,
      title: "Теряется источник сделки",
      text: "Свяжите лиды с CRM и каналами, иначе сквозная аналитика неполная.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Отчёты</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Сводки и аналитика по проекту.
          </p>
        </div>

        <ReportsHeaderControls />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniKpi icon={<Users className="h-4 w-4 text-neutral-600" />} label="Лиды" value="160" hint="+12%" />
        <MiniKpi
          icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
          label="Расход"
          value="540 000 ₽"
          hint="по каналам"
        />
        <MiniKpi icon={<Target className="h-4 w-4 text-neutral-600" />} label="CR (сайт)" value="2.6%" hint="пример" />
        <MiniKpi icon={<TrendingUp className="h-4 w-4 text-neutral-600" />} label="ROMI" value="1.4" hint="пример" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div id="report-builder" className="scroll-mt-24">
            <ReportBuilder />
          </div>

          <ReportsList />
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Авто-выводы по отчётам</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              {aiSummary.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-neutral-600" />
              <h2 className="text-base font-semibold">Критичные места</h2>
            </div>

            <div className="mt-4 space-y-2">
              {aiAlerts.map((a) => (
                <div key={a.title} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Dot tone={a.tone} />
                    <span>{a.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{a.text}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
