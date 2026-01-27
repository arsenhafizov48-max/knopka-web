// app/app/systems/page.tsx
import Link from "next/link";
import BrandIcon from "@/app/components/BrandIcon";

type Status = "connected" | "partial" | "disconnected" | "manual";

function StatusPill({ status, text }: { status: Status; text: string }) {
  const map: Record<Status, string> = {
    connected: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    disconnected: "bg-rose-50 text-rose-700 border-rose-200",
    manual: "bg-neutral-50 text-neutral-700 border-neutral-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${map[status]}`}>
      {text}
    </span>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "bad" | "info" }) {
  const c =
    tone === "ok"
      ? "bg-green-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "bad"
      ? "bg-rose-500"
      : "bg-blue-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

type IconMeta = {
  slug: string;        // ключ simple-icons
  color: string;       // цвет иконки
  tint: string;        // фон/бордер контейнера
  fallback: string;    // если slug не найден
};

type Item = {
  name: string;
  sub: string;
  status: Status;
  statusText: string;
  meta: string;
  icon: IconMeta;
};

export default function Page() {
  // Примечание: если какого-то бренда нет в simple-icons — покажется fallbackText (буква/символ)
  const integrations: Item[] = [
    {
      name: "Яндекс Метрика",
      sub: "Аналитика сайта",
      status: "connected",
      statusText: "Подключено",
      meta: "Синхронизация: 2 часа назад",
      icon: {
        slug: "yandex",
        color: "#2563eb",
        tint: "bg-blue-50 text-blue-700 border-blue-100",
        fallback: "Я",
      },
    },
    {
      name: "Google Analytics / GA4",
      sub: "Аналитика сайта",
      status: "disconnected",
      statusText: "Не подключено",
      meta: "Данные не используются",
      icon: {
        slug: "googleanalytics",
        color: "#111827",
        tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
        fallback: "G",
      },
    },
    {
      name: "Яндекс Вебмастер",
      sub: "Поисковая выдача",
      status: "connected",
      statusText: "Подключено",
      meta: "Проверка: 1 день назад",
      icon: {
        slug: "yandex",
        color: "#2563eb",
        tint: "bg-blue-50 text-blue-700 border-blue-100",
        fallback: "Я",
      },
    },
    {
      name: "Google Search Console",
      sub: "Поисковая выдача",
      status: "disconnected",
      statusText: "Не подключено",
      meta: "Часть органики не видна",
      icon: {
        slug: "googlesearchconsole",
        color: "#111827",
        tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
        fallback: "G",
      },
    },
    {
      name: "Яндекс Директ",
      sub: "Реклама",
      status: "connected",
      statusText: "Подключено",
      meta: "Импорт расходов: раз в день",
      icon: {
        slug: "yandex",
        color: "#2563eb",
        tint: "bg-blue-50 text-blue-700 border-blue-100",
        fallback: "Я",
      },
    },
    {
      name: "Авито",
      sub: "Площадка / лиды",
      status: "partial",
      statusText: "Подключено частично",
      meta: "Нет связи с CRM по сделкам",
      icon: {
        slug: "avito",
        color: "#f59e0b",
        tint: "bg-amber-50 text-amber-700 border-amber-100",
        fallback: "A",
      },
    },
  ];

  const crm: Item[] = [
    {
      name: "amoCRM",
      sub: "Основная CRM",
      status: "connected",
      statusText: "Подключено",
      meta: "Передаются сделки и этапы",
      icon: {
        slug: "amocrm",
        color: "#2563eb",
        tint: "bg-blue-50 text-blue-700 border-blue-100",
        fallback: "a",
      },
    },
    {
      name: "Битрикс24",
      sub: "CRM / продажи",
      status: "disconnected",
      statusText: "Не подключено",
      meta: "Можно подключить при необходимости",
      icon: {
        slug: "bitrix24",
        color: "#111827",
        tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
        fallback: "Б",
      },
    },
    {
      name: "YClients",
      sub: "Онлайн-запись / салоны",
      status: "connected",
      statusText: "Подключено",
      meta: "Записи и визиты передаются",
      icon: {
        slug: "yclients",
        color: "#2563eb",
        tint: "bg-blue-50 text-blue-700 border-blue-100",
        fallback: "Y",
      },
    },
    {
      name: "Офлайн-выручка",
      sub: "Касса / 1C / Excel",
      status: "manual",
      statusText: "Только импорт вручную",
      meta: "Загрузите файл или подключите кассу",
      icon: {
        slug: "cashapp",
        color: "#f59e0b",
        tint: "bg-amber-50 text-amber-700 border-amber-100",
        fallback: "₽",
      },
    },
  ];

  const aiSees = [
    "По сайту достаточно данных из Метрики, но без GA4 и GSC часть органики не видна.",
    "Расходы по Директ есть, но нет данных по другим рекламным каналам.",
    "По CRM видно, сколько заявок доходит до сделки, но офлайн-выручка частично ручная.",
    "Связка Авито → CRM не полная: нет автоматического сопоставления сделок и источника.",
  ];

  const priorities = [
    "Подключить Google Search Console, чтобы видеть полную картину по органике.",
    "Настроить автоматическую выгрузку офлайн-выручки (касса / 1C), чтобы ИИ видел маржу.",
    "Привязать сделки из Авито к CRM, чтобы считать конверсию и стоимость продаж.",
    "Добавить ещё хотя бы один рекламный источник (например, Ads), если он используется.",
  ];

  const history = [
    { tone: "ok" as const, title: "Сегодня, 10:14 • Яндекс Директ", text: "Импорт расходов завершён успешно." },
    { tone: "bad" as const, title: "Вчера, 21:03 • Авито", text: "Ошибка авторизации. Требуется обновить токен." },
    { tone: "warn" as const, title: "3 дня назад • Офлайн-выручка", text: "Загружен Excel с данными по кассе." },
    { tone: "info" as const, title: "Неделю назад • Google Analytics", text: "Попытка подключения. Доступ не был выдан." },
  ];

  const usedInReports = [
    { kpi: "Трафик сайта", sources: "Яндекс Метрика, частично органика без GSC", status: "warn", statusText: "частично" },
    { kpi: "Заявки", sources: "Формы сайта + Авито + заявки из YClients", status: "ok", statusText: "OK" },
    { kpi: "Сделки и выручка", sources: "amoCRM + YClients, офлайн-касса вручную", status: "warn", statusText: "частично" },
    { kpi: "Расходы на рекламу", sources: "Яндекс Директ, без других источников", status: "warn", statusText: "частично" },
    { kpi: "Отказы / конверсии по устройствам", sources: "Метрика", status: "ok", statusText: "OK" },
  ];

  const IconBox = ({ icon }: { icon: IconMeta }) => (
    <div className={`grid h-9 w-9 place-items-center rounded-xl border ${icon.tint}`}>
      <BrandIcon slug={icon.slug} className="h-5 w-5" color={icon.color} fallbackText={icon.fallback} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Системы и данные</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Статус интеграций: откуда берутся данные, где есть дыры и что нужно подключить, чтобы ИИ считал всё корректно.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {/* Integrations */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Статус интеграций</h2>
                <p className="mt-1 text-xs text-neutral-600">
                  Базовые системы, без которых отчёты будут неполными. ИИ подсвечивает проблемы.
                </p>
              </div>

              <button className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50">
                Обновить статусы интеграций
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {integrations.map((x) => (
                <div key={x.name} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3">
                  <div className="flex items-center gap-3">
                    <IconBox icon={x.icon} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-neutral-500">{x.sub}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{x.meta}</div>
                    </div>
                  </div>

                  <StatusPill status={x.status} text={x.statusText} />
                </div>
              ))}
            </div>
          </section>

          {/* CRM */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">CRM и офлайн-данные</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Без CRM ИИ не увидит реальные сделки и выручку. Здесь подключаются Amo, Битрикс, YClients и офлайн-касса.
            </p>

            <div className="mt-4 space-y-2">
              {crm.map((x) => (
                <div key={x.name} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3">
                  <div className="flex items-center gap-3">
                    <IconBox icon={x.icon} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-neutral-500">{x.sub}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{x.meta}</div>
                    </div>
                  </div>

                  <StatusPill status={x.status} text={x.statusText} />
                </div>
              ))}
            </div>
          </section>

          {/* Used in reports */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Какие данные ИИ реально использует в отчётах</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Если источник не подключён, эти показатели будут считаться неточно или вообще не появятся.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
              <div className="grid grid-cols-[220px_1fr_120px] bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
                <div>Показатель</div>
                <div>Источник</div>
                <div className="text-right">Статус</div>
              </div>

              <div className="divide-y divide-neutral-200">
                {usedInReports.map((r) => (
                  <div key={r.kpi} className="grid grid-cols-[220px_1fr_120px] items-center gap-3 px-3 py-3 text-sm">
                    <div className="font-medium">{r.kpi}</div>
                    <div className="text-sm text-neutral-600">{r.sources}</div>
                    <div className="flex items-center justify-end gap-2">
                      <Dot tone={r.status as any} />
                      <span className="text-xs font-medium text-neutral-700">{r.statusText}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Что ИИ видит по данным сейчас</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              {aiSees.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Приоритетные задачи по данным (предлагает ИИ)</h2>

            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              {priorities.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <Link href="/app/setup" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Открыть пошаговый чек-лист по настройке данных →
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">История подключений и ошибок</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Если что-то отвалилось — видно, когда и почему. Можно быстро понять, где затык.
            </p>

            <div className="mt-4 space-y-2">
              {history.map((h) => (
                <div key={h.title} className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Dot tone={h.tone} />
                    <span>{h.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{h.text}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
