import Link from "next/link";

type Item = {
  title: string;
  desc: string;
  tag: string;
  href?: string;
};

const items: Item[] = [
  {
    title: "Ежемесячный отчёт",
    desc: "Отчёт за 30 дней: KPI, выводы, риски, приоритеты. Открывается как отдельный документ.",
    tag: "Отчёты",
    href: "/app/reports/monthly",
  },
  {
    title: "Еженедельный отчёт",
    desc: "Отчёт за 7 дней: изменения, причины, план действий на неделю.",
    tag: "Отчёты",
    href: "/app/reports/weekly",
  },
  {
    title: "Пакеты и прайс-лист",
    desc: "Продуктовая матрица: позиции, маржа, рекомендации по упаковке и росту среднего чека.",
    tag: "Продукт",
    href: "/app/product",
  },
  {
    title: "Планы и инициативы",
    desc: "Бэклог действий: приоритеты, статусы, быстрые шаги. Чтобы внедрять, а не “думать”.",
    tag: "Планы",
    href: "/app/plans",
  },
];

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Каталог</h1>
          <p className="text-sm text-slate-600">
            Шаблоны, документы и заготовки для работы внутри КНОПКИ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            type="button"
            disabled
            title="Функция добавления появится в настройке каталога"
          >
            Добавить элемент
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Подборка</div>
          <div className="text-xs text-slate-500">
            Быстрый доступ к основным документам и разделам.
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((it) => {
            const CardInner = (
              <div className="rounded-3xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {it.title}
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {it.tag}
                  </span>
                </div>

                <div className="mt-2 text-sm text-slate-600">{it.desc}</div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Доступно в кабинете</div>
                  <div className="text-xs font-semibold text-slate-900">
                    Открыть →
                  </div>
                </div>
              </div>
            );

            return it.href ? (
              <Link key={it.title} href={it.href} className="block">
                {CardInner}
              </Link>
            ) : (
              <div key={it.title}>{CardInner}</div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
        <div className="font-semibold">Разделы каталога</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
          <li>Отчёты (еженедельные и ежемесячные)</li>
          <li>Шаблоны (таблицы, структуры, чек-листы)</li>
          <li>Стратегии (планы роста, гипотезы, приоритеты)</li>
        </ul>
      </div>
    </div>
  );
}
