// app/app/dashboard/page.tsx
import Link from "next/link";

function StatCard({
  title,
  value,
  sub,
  subTone = "neutral",
}: {
  title: string;
  value: string;
  sub?: string;
  subTone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    subTone === "good"
      ? "text-emerald-600"
      : subTone === "warn"
      ? "text-orange-600"
      : "text-neutral-500";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className={`mt-1 text-xs ${toneClass}`}>{sub}</div> : null}
    </div>
  );
}

function AlertItem({
  title,
  text,
  tone = "warn",
}: {
  title: string;
  text: string;
  tone?: "warn" | "bad" | "info";
}) {
  const dot =
    tone === "bad"
      ? "bg-red-500"
      : tone === "warn"
      ? "bg-orange-500"
      : "bg-blue-500";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-neutral-600">{text}</div>
        </div>
      </div>
    </div>
  );
}

function PlanRow({
  scope,
  title,
  days,
  status,
  statusTone,
}: {
  scope: string;
  title: string;
  days: string;
  status: string;
  statusTone: "blue" | "amber" | "neutral";
}) {
  const badge =
    statusTone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : statusTone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-neutral-50 text-neutral-700 border-neutral-200";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-[11px] text-neutral-500">{scope}</div>
        <div className="truncate text-sm font-medium">{title}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-xs text-neutral-500 sm:block">{days}</div>
        <span className={`rounded-full border px-3 py-1 text-xs ${badge}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Главный экран. ИИ показывает, где сейчас узкое место и какие планы в
            работе.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Период:</span>
          <button className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
            последние 30 дней
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Заявки" value="310" sub="+12% к прошлому периоду" subTone="good" />
        <StatCard title="Сделки" value="46" sub="+5 сделок" subTone="good" />
        <StatCard title="Выручка" value="3,2 млн ₽" sub="+410 тыс. ₽" subTone="good" />
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Main AI summary */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Главное сейчас по мнению ИИ</div>

            <div className="mt-3 space-y-2 text-sm text-neutral-700">
              <div className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-red-500" />
                <span>
                  Связка «трафик → сайт» проседает: дорогой CPL в Яндекс.Директ и
                  слабые посадочные.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" />
                <span>
                  Базовые услуги дают 86% выручки, но чек ниже рынка в 3 позициях.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" />
                <span>
                  Отдел продаж теряет сделки: недобор ~5 п.п. конверсии из заявок в
                  продажу.
                </span>
              </div>
            </div>

            <Link
              href="/app/product"
              className="mt-4 inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
            >
              Открыть общий разбор: где просадка бьёт по деньгам →
            </Link>
          </div>

          {/* Active plans */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Активные планы ИИ</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Краткий список планов, которые сейчас в работе.
                </div>
              </div>

              <Link
                href="/app/plans"
                className="text-xs text-blue-700 hover:underline"
              >
                Перейти ко всем планам →
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              <PlanRow
                scope="Продукт / базовые услуги"
                title="Поднять чек и сделать услуги прозрачными"
                days="30 дней"
                status="В работе"
                statusTone="blue"
              />
              <PlanRow
                scope="Канал / Яндекс.Директ"
                title="Оптимизировать CPL и заявки с поиска"
                days="14 дней"
                status="В работе"
                statusTone="blue"
              />
              <PlanRow
                scope="Сайт"
                title="Наладить мобильную версию и формы"
                days="21 день"
                status="Запланирован"
                statusTone="amber"
              />
            </div>
          </div>

          {/* Quick actions (link cards) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Быстрые действия</div>
            <div className="mt-1 text-xs text-neutral-500">
              Самые частые шаги, чтобы быстро улучшить ситуацию.
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link
                href="/app/channels"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Показать проблемные каналы</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Список каналов с высокой стоимостью заявки и слабой конверсией.
                </div>
              </Link>

              <Link
                href="/app/product"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Проверить прайс и продукт</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Где можно поднять чек и собрать пакеты.
                </div>
              </Link>

              <Link
                href="/app/specialists"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Подобрать специалиста</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Найти исполнителя под текущий план и нишу.
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Алерты и предупреждения</div>
            <div className="mt-3 space-y-3">
              <AlertItem
                tone="bad"
                title="Высокий CPL в Яндекс.Директ (поиск)"
                text="CPL выше цели на 35% уже 5 дней подряд."
              />
              <AlertItem
                tone="warn"
                title="Слабая конверсия сайта на мобиле"
                text="Пользователи с мобильных уходят в 1,7 раза чаще, чем с десктопа."
              />
              <AlertItem
                tone="warn"
                title="Нет данных по CRM за последние 2 дня"
                text="Проверьте выгрузку или интеграцию CRM — ИИ не видит свежие сделки."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Быстрый вопрос ИИ по дашборду</div>
            <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
              <div className="font-medium">Вы:</div>
              <div className="mt-1">
                Можно ли уже увеличивать бюджет на рекламу?
              </div>

              <div className="mt-3 font-medium">ИИ:</div>
              <div className="mt-1">
                Пока рано. Сначала улучшите посадочные и конверсию, иначе вы
                просто купите больше дорогих заявок.
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                placeholder="Напишите вопрос ИИ..."
                className="h-10 w-full rounded-full border border-neutral-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700">
                →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
