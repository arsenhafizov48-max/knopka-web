// app/app/plans/page.tsx
import Link from "next/link";
import {
  Plus,
  ArrowUpRight,
  Search,
  Filter,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Sparkles,
  ChevronRight,
} from "lucide-react";

type PlanStatus = "in_progress" | "planned" | "done" | "blocked";

function StatusPill({ status }: { status: PlanStatus }) {
  const map: Record<PlanStatus, { text: string; cls: string }> = {
    in_progress: { text: "В работе", cls: "border-blue-200 bg-blue-50 text-blue-700" },
    planned: { text: "Запланирован", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    done: { text: "Готово", cls: "border-green-200 bg-green-50 text-green-700" },
    blocked: { text: "Блокер", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${map[status].cls}`}
    >
      {map[status].text}
    </span>
  );
}

function Dot({
  tone,
}: {
  tone: "ok" | "warn" | "bad" | "info";
}) {
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

function MiniCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function PlanRow({
  title,
  area,
  owner,
  eta,
  status,
  impact,
  note,
}: {
  title: string;
  area: string;
  owner: string;
  eta: string;
  status: PlanStatus;
  impact: string;
  note: string;
}) {
  return (
    <div className="grid grid-cols-[1.25fr_0.75fr_0.65fr_0.55fr_0.6fr_0.6fr] items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-300" />
            {area}
          </span>
          <span className="text-neutral-300">•</span>
          <span className="truncate">{note}</span>
        </div>
      </div>

      <div className="text-neutral-700">{owner}</div>
      <div className="text-neutral-700">{eta}</div>
      <div>
        <StatusPill status={status} />
      </div>
      <div className="text-neutral-700">{impact}</div>

      <div className="flex items-center justify-end">
        <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50">
          Открыть <ChevronRight className="h-4 w-4 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const plans = [
    {
      title: "Оптимизировать CPL в Яндекс.Директ (поиск)",
      area: "Каналы",
      owner: "Маркетинг",
      eta: "14 дней",
      status: "in_progress" as const,
      impact: "+20–30% лидов при том же бюджете",
      note: "Чистка запросов, минуса, новые офферы и посадочные.",
    },
    {
      title: "Собрать матрицу пакетов и апселл (прайс)",
      area: "Продукт и прайс",
      owner: "Владелец",
      eta: "7 дней",
      status: "planned" as const,
      impact: "+10–15% к среднему чеку",
      note: "Состав → результат → срок → границы работ.",
    },
    {
      title: "Наладить мобильную версию сайта и формы",
      area: "Сайт",
      owner: "Продакт/UX",
      eta: "21 день",
      status: "planned" as const,
      impact: "рост конверсии мобайла x1.3",
      note: "Скорость, формы, читабельность, CTA.",
    },
    {
      title: "Связать Авито → CRM по сделкам и источникам",
      area: "Системы и данные",
      owner: "Интеграции",
      eta: "10 дней",
      status: "blocked" as const,
      impact: "точный ROMI + стоимость сделки",
      note: "Нужны доступы/токены и схема сопоставления.",
    },
    {
      title: "Запустить подписку (retainer) как 2-й шаг",
      area: "Продукт и прайс",
      owner: "Продажи",
      eta: "30 дней",
      status: "planned" as const,
      impact: "рост LTV и предсказуемость",
      note: "Отчётность, гипотезы, контроль KPI.",
    },
    {
      title: "Нормирование работ и SLA по базовой услуге",
      area: "Операционка",
      owner: "Операции",
      eta: "5 дней",
      status: "done" as const,
      impact: "+4–8 п.п. маржи",
      note: "Границы работ и регламенты по этапам.",
    },
  ];

  const aiSummary = [
    "Сейчас узкое место: CPL в Директе и слабая мобильная конверсия сайта.",
    "Второе узкое место: апселл и подписка — деньги лежат на упаковке продукта.",
    "Третье: отсутствие связки Авито → CRM мешает считать ROMI и прибыль по источникам.",
  ];

  const aiAlerts = [
    { tone: "bad" as const, title: "Блокер: интеграция Авито → CRM", text: "Без неё не считаем стоимость сделки и источник." },
    { tone: "warn" as const, title: "Риск: мобайл теряет заявки", text: "Нужна правка форм и скорость загрузки." },
    { tone: "info" as const, title: "Потенциал: апселл", text: "Матрица пакетов даст рост чека без увеличения трафика." },
  ];

  const quickActions = [
    { icon: <Sparkles className="h-4 w-4 text-neutral-600" />, title: "Сгенерировать план на 14 дней", desc: "ИИ разобьёт планы на задачи и дедлайны." },
    { icon: <Filter className="h-4 w-4 text-neutral-600" />, title: "Собрать приоритеты по деньгам", desc: "Отсортировать инициативы по влиянию на прибыль." },
    { icon: <CalendarDays className="h-4 w-4 text-neutral-600" />, title: "Собрать календарь внедрения", desc: "План-график с зависимостями и ресурсами." },
  ];

  const doneCount = plans.filter((p) => p.status === "done").length;
  const inWorkCount = plans.filter((p) => p.status === "in_progress").length;
  const blockedCount = plans.filter((p) => p.status === "blocked").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Планы и инициативы</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Что делаем, кто отвечает, какие сроки и какой эффект. Сейчас — макет, потом подключим реальные задачи из CRM/таск-трекера.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50">
            Импорт задач
          </button>

          <button className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
            <Plus className="h-4 w-4" />
            Добавить план
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-3">
        <MiniCard
          icon={<CheckCircle2 className="h-4 w-4 text-neutral-600" />}
          title="Завершено"
          value={`${doneCount}`}
          hint="за текущий период"
        />
        <MiniCard
          icon={<Clock3 className="h-4 w-4 text-neutral-600" />}
          title="В работе"
          value={`${inWorkCount}`}
          hint="активные задачи"
        />
        <MiniCard
          icon={<AlertTriangle className="h-4 w-4 text-neutral-600" />}
          title="Блокеры"
          value={`${blockedCount}`}
          hint="нужны доступы/решения"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                placeholder="Поиск по планам…"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                <Filter className="h-4 w-4 text-neutral-500" />
                Фильтры
              </button>

              <Link
                href="/app/systems"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Данные и интеграции <ArrowUpRight className="h-4 w-4 text-neutral-500" />
              </Link>
            </div>
          </div>

          {/* Table */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="grid grid-cols-[1.25fr_0.75fr_0.65fr_0.55fr_0.6fr_0.6fr] gap-3 bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-600">
              <div>План</div>
              <div>Ответственный</div>
              <div>Срок</div>
              <div>Статус</div>
              <div>Эффект</div>
              <div className="text-right">Действие</div>
            </div>

            <div className="divide-y divide-neutral-200">
              {plans.map((p) => (
                <PlanRow key={p.title} {...p} />
              ))}
            </div>
          </section>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Что ИИ считает главным сейчас</h2>
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
            <h2 className="text-base font-semibold">Алерты и предупреждения</h2>

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

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Быстрые действия</h2>
            <p className="mt-1 text-xs text-neutral-600">Шаблоны, которые ускоряют планирование.</p>

            <div className="mt-4 space-y-2">
              {quickActions.map((q) => (
                <button
                  key={q.title}
                  className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
                      {q.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{q.title}</div>
                      <div className="mt-1 text-xs text-neutral-600">{q.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/app/product"
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50"
              >
                Продукт и прайс
              </Link>
              <Link
                href="/app/dashboard"
                className="rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                На дашборд
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
