// app/app/product/page.tsx
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Pencil,
  Copy,
  Trash2,
  CircleDollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

type ItemStatus = "active" | "draft" | "archived";

function StatusPill({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { text: string; cls: string }> = {
    active: { text: "Активно", cls: "border-green-200 bg-green-50 text-green-700" },
    draft: { text: "Черновик", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    archived: { text: "Архив", cls: "border-neutral-200 bg-neutral-50 text-neutral-700" },
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

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700">
      {text}
    </span>
  );
}

function Row({
  name,
  category,
  status,
  price,
  margin,
  sales,
  updated,
  tags,
}: {
  name: string;
  category: string;
  status: ItemStatus;
  price: string;
  margin: string;
  sales: string;
  updated: string;
  tags: string[];
}) {
  return (
    <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr] items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="truncate text-xs text-neutral-500">{category}</div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((t) => (
            <Badge key={t} text={t} />
          ))}
        </div>
      </div>

      <div className="flex items-center">
        <StatusPill status={status} />
      </div>

      <div className="text-neutral-700">{price}</div>
      <div className="text-neutral-700">{margin}</div>
      <div className="text-neutral-700">{sales}</div>

      <div className="flex items-center justify-end gap-2">
        <button className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium hover:bg-neutral-50">
          <Pencil className="h-4 w-4 text-neutral-500" />
          Ред.
        </button>
        <button className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium hover:bg-neutral-50">
          <Copy className="h-4 w-4 text-neutral-500" />
          Копия
        </button>
        <button className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium hover:bg-neutral-50">
          <Trash2 className="h-4 w-4 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const items = [
    {
      name: "Базовая услуга",
      category: "Основной продукт",
      status: "active" as const,
      price: "49 000 ₽",
      margin: "62%",
      sales: "18 / мес",
      updated: "2 часа назад",
      tags: ["Хит", "Гарант. результат", "Срок: 14 дней"],
    },
    {
      name: "Расширенный пакет",
      category: "Апселл",
      status: "active" as const,
      price: "89 000 ₽",
      margin: "58%",
      sales: "7 / мес",
      updated: "вчера",
      tags: ["Апселл", "Срок: 30 дней", "Команда"],
    },
    {
      name: "Подписка (retainer)",
      category: "Повторные продажи",
      status: "draft" as const,
      price: "35 000 ₽/мес",
      margin: "70%",
      sales: "—",
      updated: "3 дня назад",
      tags: ["LTV", "Ежемесячно", "Стабильный доход"],
    },
    {
      name: "Разовая консультация",
      category: "Входной продукт",
      status: "active" as const,
      price: "5 000 ₽",
      margin: "85%",
      sales: "32 / мес",
      updated: "сегодня",
      tags: ["Лёгкий вход", "60 минут", "Zoom/Telegram"],
    },
  ];

  const aiSummary = [
    "Основной продукт даёт оборот, но маржа проседает из-за ручных работ и расплывчатого состава.",
    "Апселл покупают реже — значит, ценность пакета не очевидна в момент продажи.",
    "Подписка в черновике: без неё вы теряете LTV и предсказуемость выручки.",
  ];

  const aiAlerts = [
    { title: "Маржа у базовой услуги падает", text: "Проверьте состав работ и нормирование часов.", tone: "warn" },
    { title: "Апселл конвертит слабо", text: "Нужны триггеры апселла и ясные отличия пакетов.", tone: "warn" },
    { title: "Нет подписки", text: "Планируем retainer как «второй шаг» после результата.", tone: "bad" },
  ];

  const aiNext = [
    "Собрать матрицу пакетов: состав → результат → срок → кто делает.",
    "Ввести «стандарт» и «премиум» с понятной разницей по эффекту.",
    "Запустить подписку как “поддержание роста”: отчётность, гипотезы, контроль KPI.",
  ];

  const dot =
    (tone: "bad" | "warn" | "ok") =>
    tone === "bad" ? "bg-rose-500" : tone === "warn" ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Продукт и прайс</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Номенклатура, пакеты, цены, маржинальность и подсказки по упаковке. Сейчас — макет, потом подключим данные.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50">
            Импорт прайса
          </button>

          <button className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
            <Plus className="h-4 w-4" />
            Добавить продукт
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-3">
        <MiniKpi
          icon={<ShoppingCart className="h-4 w-4 text-neutral-600" />}
          label="Продажи (мес)"
          value="57"
          hint="+9% к прошлому месяцу"
        />
        <MiniKpi
          icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
          label="Средний чек"
          value="24 800 ₽"
          hint="Рост за счёт апселла"
        />
        <MiniKpi
          icon={<TrendingUp className="h-4 w-4 text-neutral-600" />}
          label="Маржа (средняя)"
          value="66%"
          hint="Цель: 70%"
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
                placeholder="Поиск по продуктам…"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                <Filter className="h-4 w-4 text-neutral-500" />
                Фильтры
              </button>

              <Link
                href="/app/plans"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                План по упаковке <ArrowUpRight className="h-4 w-4 text-neutral-500" />
              </Link>
            </div>
          </div>

          {/* Table */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-600">
              <div>Продукт</div>
              <div>Статус</div>
              <div>Цена</div>
              <div>Маржа</div>
              <div>Продажи</div>
              <div className="text-right">Действия</div>
            </div>

            <div className="divide-y divide-neutral-200">
              {items.map((x) => (
                <Row key={x.name} {...x} />
              ))}
            </div>
          </section>

          {/* Helper */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Быстрые правки пакетов</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Чтобы прайс не выглядел как «таблица услуг», а продавал результат.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-medium">Состав → результат</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Каждый пункт в пакете отвечает на вопрос: что изменится в деньгах/лидах.
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-medium">Границы</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Лимиты по работам и SLA: чтобы маржа не умирала от “ещё чуть-чуть”.
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-medium">Апселл-триггеры</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Переход на пакет выше после результата: “сделали X → добиваем Y”.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Что ИИ видит по продукту сейчас</h2>
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
              <h2 className="text-base font-semibold">Алерты</h2>
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
                href="/app/plans"
                className="rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Открыть планы
              </Link>

              <Link
                href="/app/reports"
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50"
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
