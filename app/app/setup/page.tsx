import Link from "next/link";

const sections = [
  {
    title: "Аналитика сайта (Метрика, GA4, Search Console)",
    items: [
      "Подключите Яндекс Метрику через OAuth в разделе «Системы и данные».",
      "Добавьте номер счётчика для каждого подключённого аккаунта Метрики.",
      "При необходимости подключите второй аккаунт Метрики — кнопка «Подключить ещё аккаунт».",
      "Google Analytics / GA4 и Search Console: подключение планируется в следующих версиях; пока отметьте вручную, используете ли вы их в маркетинге.",
    ],
  },
  {
    title: "Реклама (Яндекс Директ)",
    items: [
      "Подключите Директ через OAuth.",
      "Нажмите «Синхронизировать», чтобы выгрузить структуру кампаний.",
      "Несколько кабинетов: «Подключить ещё аккаунт» с другой почты Яндекса.",
    ],
  },
  {
    title: "CRM и лиды",
    items: [
      "Проверьте в карточках каналов ссылки на Авито и другие площадки.",
      "Убедитесь, что сделки из CRM попадают в отчёты (amoCRM, YClients и т.д.).",
      "Для офлайн-выручки используйте ручной импорт или кассу, когда появится интеграция.",
    ],
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-[800px] space-y-8 px-6 py-8">
      <div>
        <Link href="/app/systems" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Назад к системам и данным
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Чек-лист настройки данных</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Пошаговый список: что подключить, чтобы КНОПКА опиралась на реальные источники в отчётах и
          стратегии. Отмечайте пункты у себя по мере выполнения.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((s) => (
          <section key={s.title} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold text-neutral-900">{s.title}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              {s.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="text-xs text-neutral-500">
        Подсказки «Что КНОПКА видит» и «Приоритетные задачи» на странице «Системы и данные» обновляются
        автоматически по факту ваших подключений.
      </p>
    </div>
  );
}
