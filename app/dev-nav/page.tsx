import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FEATURES, type FeatureKey } from "@/app/lib/features";

/** У ссылок на кабинет prefetch выключен — иначе Next может подгружать /app и казаться, что «всё уводит во вход». */
function DevNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const isApp = href.startsWith("/app");
  return (
    <Link href={href} prefetch={!isApp} className={className}>
      {children}
    </Link>
  );
}

export const metadata: Metadata = {
  title: "КНОПКА — навигация по страницам",
  robots: { index: false, follow: false },
};

type NavItem = { href: string; label: string; hint?: string };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Публичные",
    items: [
      { href: "/", label: "Главная" },
      { href: "/login", label: "Вход" },
      { href: "/sign-up", label: "Регистрация" },
      { href: "/forgot-password", label: "Восстановление пароля" },
      { href: "/legal/privacy", label: "Политика ПДн" },
      { href: "/legal/consent", label: "Согласие на обработку ПДн" },
      { href: "/legal/terms", label: "Пользовательское соглашение" },
      { href: "/demo", label: "Старый URL /demo → редирект в кабинет" },
    ],
  },
  {
    title: "Кабинет /app",
    items: [
      { href: "/app/dashboard", label: "Дашборд" },
      { href: "/app/strategy", label: "Стратегия (создать / просмотр)" },
      { href: "/app/setup", label: "Setup" },
      { href: "/app/product", label: "Продукт" },
      { href: "/app/catalog", label: "Каталог" },
      { href: "/app/channels", label: "Каналы" },
      { href: "/app/data", label: "Данные (ежедневный ввод + воронка)" },
      { href: "/app/specialists", label: "Специалисты" },
      { href: "/app/specialists/catalog", label: "Специалисты — каталог" },
      { href: "/app/plans", label: "Тарифы / планы" },
      { href: "/app/reports", label: "Отчёты" },
      {
        href: "/app/reports?from=2026-01-01&to=2026-01-31&template=business_summary",
        label: "Отчёты (с параметрами в URL)",
        hint: "пример фильтров",
      },
      { href: "/app/settings", label: "Настройки" },
      { href: "/app/systems", label: "Системы" },
      { href: "/app/fact", label: "Факт" },
    ],
  },
  {
    title: "Онбординг",
    items: [
      { href: "/app/onboarding/step-1", label: "Шаг 1" },
      { href: "/app/onboarding/step-2", label: "Шаг 2" },
      { href: "/app/onboarding/step-3", label: "Шаг 3" },
      { href: "/app/onboarding/step-4", label: "Шаг 4" },
      { href: "/app/onboarding/review", label: "Проверка" },
      { href: "/app/onboarding/done", label: "Готово" },
    ],
  },
];

const WIP_KEYS = Object.keys(FEATURES) as FeatureKey[];

export default function DevNavPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Служебная страница
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Навигация по КНОПКЕ
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Для быстрых переходов при разработке. Не индексируется поиском (
            <code className="rounded bg-slate-100 px-1 text-xs">noindex</code>
            ).
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Почему ссылки «Кабинет» и «Онбординг» открывают вход?</p>
            <p className="mt-2 leading-relaxed">
              Все адреса вида <code className="rounded bg-white/80 px-1 text-xs">/app/…</code> защищены:
              без аккаунта Supabase вас перенаправит на{" "}
              <Link href="/login" className="font-medium text-violet-700 underline">
                /login
              </Link>{" "}
              (это не баг). Сначала войдите или зарегистрируйтесь — потом ссылки кабинета откроются.
            </p>
            <p className="mt-3 leading-relaxed">
              <strong>Обойти вход только на своём ПК для проверки экранов:</strong> в файл{" "}
              <code className="rounded bg-white/80 px-1 text-xs">.env.local</code> добавьте строку{" "}
              <code className="rounded bg-white/80 px-1 text-xs">
                NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH=1
              </code>
              , сохраните и перезапустите <code className="rounded bg-white/80 px-1 text-xs">npm run dev</code>
              . На продакшене это включать нельзя.
            </p>
          </div>

          <div className="mt-8 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-sm font-semibold text-slate-500">
                  {section.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <DevNavLink
                        href={item.href}
                        className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:border-violet-300 hover:bg-violet-50/60"
                      >
                        <span className="font-medium text-slate-900 group-hover:text-violet-800">
                          {item.label}
                        </span>
                        <span className="mt-0.5 break-all font-mono text-xs text-slate-500">
                          {item.href}
                        </span>
                        {item.hint ? (
                          <span className="mt-1 text-xs text-slate-400">
                            {item.hint}
                          </span>
                        ) : null}
                      </DevNavLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section>
              <h2 className="text-sm font-semibold text-slate-500">
                Разделы в разработке (WIP)
              </h2>
              <ul className="mt-3 space-y-2">
                {WIP_KEYS.map((key) => (
                  <li key={key}>
                    <DevNavLink
                      href={`/app/wip/${key}`}
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/50"
                    >
                      <span className="font-medium text-slate-900 group-hover:text-amber-900">
                        {FEATURES[key].title}
                      </span>
                      <span className="mt-0.5 font-mono text-xs text-slate-500">
                        /app/wip/{key}
                      </span>
                    </DevNavLink>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-500">
                Динамические страницы
              </h2>
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <strong>Отчёт по ID:</strong>{" "}
                  <code className="rounded bg-white px-1 ring-1 ring-slate-200">
                    /app/reports/{"{id}"}
                  </code>
                </p>
                <p className="mt-2">
                  ID появляется после генерации отчёта на странице «Отчёты» —
                  открой сохранённый отчёт из списка, либо скопируй ссылку из
                  браузера.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
