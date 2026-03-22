import Link from "next/link";
import { CheckCircle2, ArrowRight, Settings2, FileText } from "lucide-react";

export default function DonePage() {
  return (
    <div className="min-h-[calc(100vh-48px)] px-4 py-10">
      <div className="mx-auto w-full max-w-[920px]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Мы настраиваем КНОПКУ под ваш бизнес
              </h1>

              <p className="mt-2 text-sm text-neutral-600">
                Проект создан. Фактура сохранена. Дальше вы сможете вносить метрики и
                видеть динамику в дашборде и отчётах.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/app/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Перейти в кабинет <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/app/fact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  Открыть фактуру <FileText className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <Settings2 className="h-4 w-4" />
              Что уже учтено в проекте
            </div>

            <ul className="mt-3 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
              <li className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                Точка А / Точка Б
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                Цели на 3–6 месяцев
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                Продукт и экономика
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                Каналы и материалы
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
