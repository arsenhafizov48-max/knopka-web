// app/app/channels/page.tsx
import Link from "next/link";
import {
  Megaphone,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CircleDollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

type ChannelStatus = "active" | "paused" | "draft" | "needs_data";

function StatusPill({ status }: { status: ChannelStatus }) {
  const map: Record<ChannelStatus, { text: string; cls: string }> = {
    active: {
      text: "Активен",
      cls: "border-green-200 bg-green-50 text-green-700",
    },
    paused: {
      text: "На паузе",
      cls: "border-neutral-200 bg-neutral-50 text-neutral-700",
    },
    draft: {
      text: "Черновик",
      cls: "border-amber-200 bg-amber-50 text-amber-700",
    },
    needs_data: {
      text: "Нужны данные",
      cls: "border-rose-200 bg-rose-50 text-rose-700",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${map[status].cls}`}
    >
      {map[status].text}
    </span>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
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

function Row({
  name,
  type,
  status,
  leads,
  spend,
  cpl,
  roi,
  updated,
  owner,
  note,
}: {
  name: string;
  type: string;
  status: ChannelStatus;
  leads: string;
  spend: string;
  cpl: string;
  roi: string;
  updated: string;
  owner: string;
  note: string;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="truncate text-xs text-neutral-500">{type}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <StatusPill status={status} />
      </div>

      <div className="text-neutral-700">{leads}</div>
      <div className="text-neutral-700">{spend}</div>
      <div className="text-neutral-700">{cpl}</div>
      <div className="text-neutral-700">{roi}</div>

      <div className="min-w-0 text-right">
        <div className="text-xs text-neutral-500">{updated}</div>
        <div className="truncate text-xs text-neutral-500">{owner}</div>
        <div className="truncate text-xs text-neutral-500">{note}</div>
      </div>
    </div>
  );
}

export default function Page() {
  const channels = [
    {
      name: "Яндекс.Директ (поиск)",
      type: "Платный трафик → заявки",
      status: "active" as const,
      leads: "118",
      spend: "420 000 ₽",
      cpl: "3 560 ₽",
      roi: "1.6",
      updated: "Обновлено: 2 часа назад",
      owner: "Ответственный: маркетинг",
      note: "Есть риск: CPL растёт",
    },
    {
      name: "Яндекс.Директ (РСЯ)",
      type: "Платный трафик → прогрев",
      status: "paused" as const,
      leads: "42",
      spend: "120 000 ₽",
      cpl: "2 860 ₽",
      roi: "1.1",
      updated: "Обновлено: 3 дня назад",
      owner: "Ответственный: маркетинг",
      note: "Пауза: пересборка креативов",
    },
    {
      name: "SEO / органика",
      type: "Поисковый трафик → заявки",
      status: "needs_data" as const,
      leads: "—",
      spend: "—",
      cpl: "—",
      roi: "—",
      updated: "Нет данных",
      owner: "Ответственный: подрядчик",
      note: "Нужно подключить GSC",
    },
    {
      name: "Авито",
      type: "Площадка → лиды/звонки",
      status: "draft" as const,
      leads: "—",
      spend: "—",
      cpl: "—",
      roi: "—",
      updated: "Черновик",
      owner: "Ответственный: продажи",
      note: "Нужно настроить цели/CRM",
    },
  ];

  const aiSummary = [
    "Платный трафик даёт лиды, но CPL нестабилен — часть бюджета уходит в «пустые клики».",
    "Органика видна частично: без Search Console провалы в запросах не ловятся.",
    "Авито не связывается со сделками — ИИ не может посчитать реальную стоимость продажи.",
  ];

  const aiAlerts = [
    {
      title: "CPL в Директе растёт",
      text: "В 5 из 7 дней CPL выше целевого.",
      tone: "bad",
    },
    {
      title: "Нет данных по SEO",
      text: "Подключите Search Console для полной картины.",
      tone: "warn",
    },
    {
      title: "Неполная связка лид → сделка",
      text: "CRM получает заявки, но источник теряется.",
      tone: "warn",
    },
  ];

  const aiNext = [
    "Пересобрать кампании поиска: минус-фразы + корректировки по устройствам.",
    "Разнести посадочные под 2–3 ключевых сегмента (снизит CPL).",
    "Подключить GSC и свести лиды со сделками (сквозная станет честной).",
  ];

  const dot =
    (tone: "bad" | "warn" | "ok") =>
    tone === "bad"
      ? "bg-rose-500"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Каналы</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Источники лидов, статусы, KPI и рекомендации. Пока — макет, потом подключим данные и ИИ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 md:flex">
            <Clock className="h-4 w-4 text-neutral-500" />
            <span>Период:</span>
            <span className="font-medium">последние 30 дней</span>
          </div>

          <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50">
            Импорт KPI
          </button>

          <button className="rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
            Добавить канал
          </button>
        </div>
      </div>

      {/* KPI mini */}
      <div className="grid gap-3 md:grid-cols-3">
        <MiniKpi
          icon={<Users className="h-4 w-4 text-neutral-600" />}
          label="Лиды"
          value="160"
          hint="+12% к прошлому периоду"
        />
        <MiniKpi
          icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
          label="Расход"
          value="540 000 ₽"
          hint="Контроль бюджета по каналам"
        />
        <MiniKpi
          icon={<TrendingUp className="h-4 w-4 text-neutral-600" />}
          label="Средний CPL"
          value="3 375 ₽"
          hint="Цель: 3 000 ₽"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                placeholder="Поиск по каналам…"
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
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-600">
              <div>Канал</div>
              <div>Статус</div>
              <div>Лиды</div>
              <div>Расход</div>
              <div>CPL</div>
              <div>ROI</div>
              <div className="text-right">Обновление</div>
            </div>

            <div className="divide-y divide-neutral-200">
              {channels.map((c) => (
                <Row key={c.name} {...c} />
              ))}
            </div>
          </section>

          {/* Hint block */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Что менять в первую очередь</h2>
                <p className="mt-1 text-xs text-neutral-600">
                  Этот блок станет «умным»: будет собираться из фактуры + подключённых источников.
                </p>
              </div>

              <Link
                href="/app/plans"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Перейти к планам →
              </Link>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li className="flex gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span>Каналы с “Нужны данные” блокируют отчёты — закрой их первым делом.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span>Для платных каналов держим CPL в коридоре — иначе рост = слив бюджета.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span>ROI здесь пока “демо”, потом подтянем из CRM и выручки.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Что ИИ видит по каналам сейчас</h2>
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
              <h2 className="text-base font-semibold">Алерты и предупреждения</h2>
            </div>

            <div className="mt-4 space-y-2">
              {aiAlerts.map((a) => (
                <div key={a.title} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot(a.tone as any)}`} />
                    <span>{a.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{a.text}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Следующие шаги (предлагает ИИ)</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              {aiNext.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/app/setup"
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50"
              >
                Открыть настройку данных
              </Link>

              <Link
                href="/app/reports"
                className="rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Перейти к отчётам
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
