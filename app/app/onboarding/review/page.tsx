"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SaveToast from "@/app/components/SaveToast";
import {
  loadProjectFact,
  setLastStep,
  setOnboardingDone,
} from "@/app/app/lib/projectFact";

type Fact = ReturnType<typeof loadProjectFact>;

const GOAL_LABELS: Record<string, string> = {
  more_leads: "Больше заявок",
  avg_check_up: "Повысить средний чек",
  marketing_understand: "Разобраться с маркетингом",
  analytics_order: "Навести порядок в аналитике",
};

function money(x: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(x);
}

function toNumber(v: any) {
  const s = String(v ?? "").replace(/\s/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function pickPointAB(fact: any) {
  const a = fact?.pointA ?? {};
  const b = fact?.pointB ?? {};

  const aRevenue = toNumber(a?.revenue ?? fact?.currentRevenue ?? "");
  const aClients = toNumber(a?.clients ?? fact?.currentClients ?? "");
  const bRevenue = toNumber(b?.revenue ?? fact?.targetRevenue ?? "");
  const bClients = toNumber(b?.clients ?? fact?.targetClients ?? "");

  return { aRevenue, aClients, bRevenue, bClients };
}

function FilesList({ files }: { files: string[] }) {
  if (!Array.isArray(files) || files.length === 0) {
    return (
      <div className="mt-2 text-xs text-neutral-600">Файлы не загружены</div>
    );
  }
  return (
    <div className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">
      {files.join(", ")}
    </div>
  );
}

export default function OnboardingReviewPage() {
  const router = useRouter();
  const [toast, setToast] = useState(false);
  const [fact, setFact] = useState<Fact>(() => loadProjectFact());

  useEffect(() => {
    setFact(loadProjectFact());
  }, []);

  const point = useMemo(() => pickPointAB(fact as any), [fact]);

  const connected = (fact?.channels?.connected ?? []).filter(Boolean);

  const budgetsList = (fact as any)?.channelBudgets ?? [];
  const specialistsList = (fact as any)?.specialistCosts ?? [];

  const totalAdsBudget = useMemo(
    () => budgetsList.reduce((s: number, r: any) => s + toNumber(r?.budget), 0),
    [budgetsList]
  );

  const totalSpecialists = useMemo(
    () =>
      specialistsList.reduce((s: number, r: any) => s + toNumber(r?.cost), 0),
    [specialistsList]
  );

  const goalText = String((fact as any)?.goal ?? "").trim();

  const goals: string[] = Array.isArray((fact as any)?.goals)
    ? (fact as any).goals
    : [];

  const goalDetails = (fact as any)?.goalDetails ?? {};

  const materials = (fact as any)?.materials ?? {
    commercialFiles: [],
    priceFiles: [],
    brandFiles: [],
    aiComment: "",
  };

  const integrations = Array.isArray((fact as any)?.integrations)
    ? (fact as any).integrations
    : [];

  const connectedIntegrationsCount = integrations.filter(
    (x: any) => x?.status === "connected" || x?.status === "configured"
  ).length;

  const missing = useMemo(() => {
    const list: string[] = [];

    const projectName = String((fact as any)?.projectName ?? "").trim();
    const niche = String((fact as any)?.niche ?? "").trim();
    const geo = String((fact as any)?.geo ?? "").trim();

    const avgCheckNow = String((fact as any)?.economics?.averageCheck ?? "")
      .trim();

    if (!projectName) list.push("Название проекта");
    if (!niche) list.push("Ниша");
    if (!geo) list.push("Город / регион");
    if (!goalText) list.push("Цель (текстом)");

    if (!(point.aRevenue > 0 && point.aClients > 0))
      list.push("Точка A (выручка и клиенты)");
    if (!(point.bRevenue > 0 && point.bClients > 0))
      list.push("Точка B (выручка и клиенты)");

    if (!avgCheckNow) list.push("Средний чек (сейчас)");

    if (goals.includes("more_leads")) {
      if (!String(goalDetails?.moreLeadsNow ?? "").trim())
        list.push("Больше заявок — сколько сейчас");
      if (!String(goalDetails?.moreLeadsWant ?? "").trim())
        list.push("Больше заявок — сколько хотите");
    }
    if (goals.includes("avg_check_up")) {
      if (!String(goalDetails?.avgCheckWant ?? "").trim())
        list.push("Повысить средний чек — сколько хотите");
    }
    if (goals.includes("marketing_understand")) {
      if (!String(goalDetails?.marketingComment ?? "").trim())
        list.push("Разобраться с маркетингом — комментарий");
    }
    if (goals.includes("analytics_order")) {
      if (!String(goalDetails?.analyticsComment ?? "").trim())
        list.push("Навести порядок в аналитике — комментарий");
    }

    return list;
  }, [fact, goalText, goals, goalDetails, point]);

  const canFinish = missing.length === 0;

  const finish = () => {
    setOnboardingDone(true);
    setLastStep(4);
    setToast(true);
    window.setTimeout(() => setToast(false), 1200);
    window.setTimeout(() => router.push("/app/onboarding/done"), 200);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] px-6 py-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <SaveToast
          open={toast}
          onClose={() => setToast(false)}
          title="Сохранено"
          description="Настройка завершена"
        />

        {/* Шапка без лишних контейнеров */}
        <div className="mb-6">
          <div className="text-xs text-neutral-500">Проверка данных</div>
          <div className="mt-1 text-2xl font-semibold">
            Проверьте, что всё заполнено правильно
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            Можно вернуться в любой шаг, изменить данные и снова сохранить. Когда
            всё ок — завершайте настройку.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2">
            {/* Сводка бюджетов */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-neutral-900">
                Бюджеты (в месяц)
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Сводка по рекламе и специалистам
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-500">Реклама</div>
                  <div className="mt-1 text-sm text-neutral-900">
                    {totalAdsBudget ? `${money(totalAdsBudget)} ₽` : "—"}
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-500">Специалисты</div>
                  <div className="mt-1 text-sm text-neutral-900">
                    {totalSpecialists ? `${money(totalSpecialists)} ₽` : "—"}
                  </div>
                </div>
              </div>

              {/* Ошибки */}
              {!canFinish && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-medium text-amber-900">
                    Нужно заполнить обязательные поля
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {missing.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => router.push("/app/onboarding/step-1")}
                      className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      Перейти и заполнить
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Контент в 2 колонки */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Бизнес */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      Бизнес
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Название, ниша, регион, цель, чек, точка A/B
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/app/onboarding/step-1")}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Изменить
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Название</div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {String((fact as any)?.projectName ?? "").trim() || "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Ниша</div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {String((fact as any)?.niche ?? "").trim() || "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">
                      Город / регион
                    </div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {String((fact as any)?.geo ?? "").trim() || "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Цель</div>
                    <div className="mt-1 text-sm text-neutral-900 whitespace-pre-wrap">
                      {goalText || "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Средний чек</div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {String((fact as any)?.economics?.averageCheck ?? "")
                        .trim() || "—"}
                    </div>
                  </div>

                  <div
                    className={`rounded-xl p-3 ${
                      point.aRevenue > 0 && point.aClients > 0
                        ? "bg-neutral-50"
                        : "bg-rose-50"
                    }`}
                  >
                    <div className="text-xs text-neutral-500">
                      Сейчас (точка A)
                    </div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {point.aRevenue > 0 && point.aClients > 0
                        ? `${money(point.aRevenue)} ₽ • ${money(
                            point.aClients
                          )} клиентов`
                        : "—"}
                    </div>
                  </div>

                  <div
                    className={`rounded-xl p-3 ${
                      point.bRevenue > 0 && point.bClients > 0
                        ? "bg-neutral-50"
                        : "bg-rose-50"
                    }`}
                  >
                    <div className="text-xs text-neutral-500">
                      Цель (точка B)
                    </div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {point.bRevenue > 0 && point.bClients > 0
                        ? `${money(point.bRevenue)} ₽ • ${money(
                            point.bClients
                          )} клиентов`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Цели */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      Цели
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Цели и детали из шага 1
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/app/onboarding/step-1")}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Изменить
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {goals.length ? (
                    goals.map((g) => (
                      <div
                        key={g}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="text-sm font-medium text-neutral-900">
                          {GOAL_LABELS[g] ?? g}
                        </div>

                        {g === "more_leads" ? (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-white p-3">
                              <div className="text-xs text-neutral-500">
                                Сколько сейчас (в месяц)
                              </div>
                              <div className="mt-1 text-sm text-neutral-900">
                                {String(goalDetails?.moreLeadsNow ?? "").trim() ||
                                  "—"}
                              </div>
                            </div>
                            <div className="rounded-xl bg-white p-3">
                              <div className="text-xs text-neutral-500">
                                Сколько хотите (в месяц)
                              </div>
                              <div className="mt-1 text-sm text-neutral-900">
                                {String(
                                  goalDetails?.moreLeadsWant ?? ""
                                ).trim() || "—"}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {g === "avg_check_up" ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="text-xs text-neutral-500">
                              Хочу (средний чек)
                            </div>
                            <div className="mt-1 text-sm text-neutral-900">
                              {String(goalDetails?.avgCheckWant ?? "").trim() ||
                                "—"}
                            </div>
                          </div>
                        ) : null}

                        {g === "marketing_understand" ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="text-xs text-neutral-500">
                              Комментарий
                            </div>
                            <div className="mt-1 text-sm text-neutral-900 whitespace-pre-wrap">
                              {String(
                                goalDetails?.marketingComment ?? ""
                              ).trim() || "—"}
                            </div>
                          </div>
                        ) : null}

                        {g === "analytics_order" ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="text-xs text-neutral-500">
                              Комментарий
                            </div>
                            <div className="mt-1 text-sm text-neutral-900 whitespace-pre-wrap">
                              {String(
                                goalDetails?.analyticsComment ?? ""
                              ).trim() || "—"}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
                      Цели не выбраны
                    </div>
                  )}
                </div>
              </div>

              {/* Каналы */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      Каналы и бюджеты
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Каналы, бюджеты по каналам, расходы по специалистам
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/app/onboarding/step-2")}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Изменить
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">
                      Подключено каналов
                    </div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {connected.length || "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">
                      Интеграций подключено/настроено
                    </div>
                    <div className="mt-1 text-sm text-neutral-900">
                      {connectedIntegrationsCount || "—"}
                    </div>
                  </div>
                </div>

                {/* Таблица бюджетов */}
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Реклама по каналам
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50">
                        <tr className="text-left text-xs text-neutral-600">
                          <th className="px-3 py-2">Канал</th>
                          <th className="px-3 py-2">Бюджет</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetsList.length ? (
                          budgetsList.map((r: any) => (
                            <tr
                              key={r?.id ?? r?.channel}
                              className="border-t border-neutral-200"
                            >
                              <td className="px-3 py-2">
                                {String(r?.channel ?? "").trim() || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {toNumber(r?.budget)
                                  ? `${money(toNumber(r?.budget))} ₽`
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t border-neutral-200">
                            <td className="px-3 py-2 text-neutral-600" colSpan={2}>
                              Данных нет
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Таблица специалистов */}
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Специалисты
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50">
                        <tr className="text-left text-xs text-neutral-600">
                          <th className="px-3 py-2">Специалист</th>
                          <th className="px-3 py-2">Расход</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specialistsList.length ? (
                          specialistsList.map((r: any) => (
                            <tr
                              key={r?.id ?? r?.role}
                              className="border-t border-neutral-200"
                            >
                              <td className="px-3 py-2">
                                {String(r?.role ?? "").trim() || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {toNumber(r?.cost)
                                  ? `${money(toNumber(r?.cost))} ₽`
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t border-neutral-200">
                            <td className="px-3 py-2 text-neutral-600" colSpan={2}>
                              Данных нет
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Материалы */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      Материалы
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Загруженные файлы (без цифр)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/app/onboarding/step-4")}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Изменить
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-medium text-neutral-900">
                      Коммерческие предложения
                    </div>
                    <FilesList files={materials?.commercialFiles ?? []} />
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-medium text-neutral-900">
                      Прайсы
                    </div>
                    <FilesList files={materials?.priceFiles ?? []} />
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-medium text-neutral-900">
                      Бренд
                    </div>
                    <FilesList files={materials?.brandFiles ?? []} />
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className="md:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => router.push("/app/onboarding/step-4")}
                    className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    Назад
                  </button>

                  <button
                    type="button"
                    disabled={!canFinish}
                    onClick={finish}
                    className={`rounded-full px-6 py-3 text-sm font-medium text-white ${
                      canFinish
                        ? "bg-neutral-900 hover:bg-neutral-800"
                        : "cursor-not-allowed bg-neutral-300"
                    }`}
                  >
                    Завершить настройку
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-neutral-900">
                Подсказка
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                Обязательные поля для завершения:
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                <li>Цель (текстом)</li>
                <li>Средний чек (сейчас)</li>
                <li>Точка A и точка B (выручка и клиенты)</li>
                <li>Детали выбранных целей</li>
              </ul>

              <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
                После завершения настройки вы перейдёте в кабинет.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
