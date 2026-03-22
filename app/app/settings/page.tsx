// app/app/settings/page.tsx
import AccountSignOutHost from "@/app/components/AccountSignOutHost";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm text-slate-500">Настройки</div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль и доступ</h1>
      </div>

      <AccountSignOutHost />

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Настройки</h2>
          <p className="text-sm text-slate-600">
            Параметры проекта: язык, валюта, подключённые источники и настройки помощника.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <div className="text-sm font-semibold">Проект</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Название</div>
                <div className="mt-1 text-sm text-slate-900">КНОПКА (демо)</div>
              </div>

              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Валюта</div>
                <div className="mt-1 text-sm text-slate-900">₽ (по умолчанию)</div>
              </div>

              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Язык</div>
                <div className="mt-1 text-sm text-slate-900">Русский</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <div className="text-sm font-semibold">ИИ</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Режим ответа</div>
                <div className="mt-1 text-sm text-slate-900">Коротко и по делу (по умолчанию)</div>
              </div>

              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Контекст разделов</div>
                <div className="mt-1 text-sm text-slate-900">
                  Дашборд • Каналы • Продукт • Системы • Планы • Отчёты
                </div>
              </div>

              <div className="rounded-2xl bg-[#F4F7FF] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Лимиты ответа</div>
                <div className="mt-1 text-sm text-slate-900">
                  Будем управлять длиной ответа и расходом текста в запросах.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <div className="text-sm font-semibold">Статус</div>
          <div className="mt-1 text-sm text-slate-600">
            Часть настроек появится после заполнения фактуры бизнеса и подключения источников данных.
          </div>
        </div>
      </div>
    </div>
  );
}
