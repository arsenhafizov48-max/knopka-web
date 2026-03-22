"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SaveToast from "@/app/components/SaveToast";
import OnboardingStepsNav from "@/app/components/OnboardingStepsNav";
import {
  loadProjectFact,
  patchProjectFact,
  setLastStep,
  normalizeText,
} from "@/app/app/lib/projectFact";

type Fact = ReturnType<typeof loadProjectFact>;

type GoalKey =
  | "more_leads"
  | "avg_check_up"
  | "marketing_understand"
  | "analytics_order";

type Step1Draft = {
  projectName: string;
  niche: string;
  geo: string;

  legalForm: Fact["legalForm"];
  workFormat: Fact["workFormat"];

  averageCheckNow: string; // ОБЯЗАТЕЛЬНО

  // Точка А / Б (обязательные блоки)
  aRevenue: string;
  aClients: string;
  bRevenue: string;
  bClients: string;

  servicesText: string; // строкой, пушим в services[]

  // цели (чекбоксы) + доп-поля
  goals: Record<GoalKey, boolean>;
  goal_more_leads_now: string;
  goal_more_leads_want: string;

  goal_avg_check_want: string;

  goal_marketing_comment: string;
  goal_analytics_comment: string;
};

function onlyDigitsLike(v: string) {
  return v.replace(/[^0-9.,\s]/g, "");
}

function toServicesArray(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readInitialDraft(fact: Fact): Step1Draft {
  // текущая схема v4
  const projectName = (fact as any)?.projectName ?? "";
  const niche = (fact as any)?.niche ?? "";
  const geo = (fact as any)?.geo ?? "";

  const servicesText = Array.isArray((fact as any)?.services)
    ? (fact as any).services.join(", ")
    : "";

  // средний чек: берём из economics.averageCheck (как у тебя в проектFact)
  const avg = (fact as any)?.economics?.averageCheck ?? "";

  // точка A/B
  const a = (fact as any)?.pointA ?? {};
  const b = (fact as any)?.pointB ?? {};

  // цели
  const goalsArr: string[] = Array.isArray((fact as any)?.goals)
    ? (fact as any).goals
    : [];
  const has = (key: string) => goalsArr.includes(key);

  const details = (fact as any)?.goalDetails ?? {};

  return {
    projectName: String(projectName),
    niche: String(niche),
    geo: String(geo),

    legalForm: (fact as any)?.legalForm ?? "ИП",
    workFormat: (fact as any)?.workFormat ?? "Онлайн",

    averageCheckNow: String(avg),

    aRevenue: String(a?.revenue ?? ""),
    aClients: String(a?.clients ?? ""),
    bRevenue: String(b?.revenue ?? ""),
    bClients: String(b?.clients ?? ""),

    servicesText,

    goals: {
      more_leads: has("more_leads"),
      avg_check_up: has("avg_check_up"),
      marketing_understand: has("marketing_understand"),
      analytics_order: has("analytics_order"),
    },
    goal_more_leads_now: String(details?.moreLeadsNow ?? ""),
    goal_more_leads_want: String(details?.moreLeadsWant ?? ""),

    goal_avg_check_want: String(details?.avgCheckWant ?? ""),

    goal_marketing_comment: String(details?.marketingComment ?? ""),
    goal_analytics_comment: String(details?.analyticsComment ?? ""),
  };
}

function validateDraft(d: Step1Draft) {
  const errors: Record<string, string> = {};

  // обязательные
  if (!normalizeText(d.projectName)) errors.projectName = "Укажите название компании";
  if (!normalizeText(d.niche)) errors.niche = "Укажите нишу / направление";
  if (!normalizeText(d.geo)) errors.geo = "Укажите город / регион";

  if (!normalizeText(d.averageCheckNow)) {
    errors.averageCheckNow = "Укажите средний чек";
  }

  // точка А/Б обязательна
  if (!normalizeText(d.aRevenue)) errors.aRevenue = "Укажите оборот (точка А)";
  if (!normalizeText(d.aClients)) errors.aClients = "Укажите клиентов/продажи (точка А)";
  if (!normalizeText(d.bRevenue)) errors.bRevenue = "Укажите оборот (точка Б)";
  if (!normalizeText(d.bClients)) errors.bClients = "Укажите клиентов/продажи (точка Б)";

  // условные обязательные
  if (d.goals.more_leads) {
    if (!normalizeText(d.goal_more_leads_now)) {
      errors.goal_more_leads_now = "Заполните: сколько заявок/продаж сейчас";
    }
    if (!normalizeText(d.goal_more_leads_want)) {
      errors.goal_more_leads_want = "Заполните: сколько заявок/продаж хотите";
    }
  }

  if (d.goals.avg_check_up) {
    // текущий чек уже обязателен — доп-поле это «хочу»
    if (!normalizeText(d.goal_avg_check_want)) {
      errors.goal_avg_check_want = "Заполните: какой средний чек нужен (точка Б)";
    }
  }

  if (d.goals.marketing_understand) {
    if (!normalizeText(d.goal_marketing_comment)) {
      errors.goal_marketing_comment = "Опишите: что значит ‘разобраться с маркетингом’";
    }
  }

  if (d.goals.analytics_order) {
    if (!normalizeText(d.goal_analytics_comment)) {
      errors.goal_analytics_comment = "Опишите: какая проблема в аналитике сейчас";
    }
  }

  return errors;
}

function SmallError({ text }: { text: string }) {
  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 animate-[shake_0.25s_ease-in-out_0s_2]">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      {text}
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const [toast, setToast] = useState(false);
  const [fact, setFact] = useState<Fact | null>(null);
  const [draft, setDraft] = useState<Step1Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const firstErrorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const f = loadProjectFact();
    setFact(f);
    setDraft(readInitialDraft(f));
  }, []);

  const showSaved = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 1400);
  };

  const syncAverageCheckEverywhere = (nextAvg: string, d: Step1Draft) => {
    // средний чек хранится в economics.averageCheck (в fact)
    // а также используем его как «сейчас» для цели avg_check_up
    return {
      ...d,
      averageCheckNow: nextAvg,
    };
  };

  const onSave = () => {
    if (!draft) return;

    const e = validateDraft(draft);
    setErrors(e);

    if (Object.keys(e).length > 0) {
      // маленькое предупреждение и скролл к первому
      window.setTimeout(() => {
        firstErrorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return;
    }

    const patch: any = {
      projectName: draft.projectName.trim(),
      niche: draft.niche.trim(),
      geo: draft.geo.trim(),
      legalForm: draft.legalForm,
      workFormat: draft.workFormat,

      services: toServicesArray(draft.servicesText),

      economics: {
        ...(fact as any)?.economics,
        averageCheck: draft.averageCheckNow.trim(),
        // то же, что список услуг — стратегия и отчёты читают economics.product
        product: draft.servicesText.trim(),
      },

      pointA: {
        revenue: draft.aRevenue.trim(),
        clients: draft.aClients.trim(),
        averageCheck: draft.averageCheckNow.trim(),
      },
      pointB: {
        revenue: draft.bRevenue.trim(),
        clients: draft.bClients.trim(),
        averageCheck: draft.goals.avg_check_up
          ? draft.goal_avg_check_want.trim()
          : "",
      },

      goals: Object.entries(draft.goals)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),

      goalDetails: {
        moreLeadsNow: draft.goal_more_leads_now.trim(),
        moreLeadsWant: draft.goal_more_leads_want.trim(),
        avgCheckWant: draft.goal_avg_check_want.trim(),
        marketingComment: draft.goal_marketing_comment.trim(),
        analyticsComment: draft.goal_analytics_comment.trim(),
      },
    };

    patchProjectFact(patch);
    setLastStep(1);
    showSaved();

    // перечитываем, чтобы правые блоки/шапка сразу обновились
    const f2 = loadProjectFact();
    setFact(f2);
    setDraft(readInitialDraft(f2));
  };

  const canGoNext = useMemo(() => {
    if (!draft) return false;
    const e = validateDraft(draft);
    return Object.keys(e).length === 0;
  }, [draft]);

  const goNext = () => {
    // требование: нельзя дальше без сохранения
    // поэтому: сначала validate + save
    onSave();
    // если после onSave нет ошибок — идём дальше
    window.setTimeout(() => {
      const e = validateDraft(draft as Step1Draft);
      if (Object.keys(e).length === 0) {
        setLastStep(2);
        router.push("/app/onboarding/step-2");
      }
    }, 60);
  };

  if (!draft) {
    return <div className="p-6 text-sm text-neutral-600">Загрузка…</div>;
  }

  const firstError = Object.values(errors)[0];

  return (
    <div className="mx-auto w-full max-w-none px-0">
      <SaveToast open={toast} />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="text-xs text-neutral-500">Шаг 1 из 4</div>
            <div className="mt-1 text-2xl font-semibold">Бизнес</div>
            <div className="mt-3">
              <OnboardingStepsNav currentStep={1} />
            </div>

            {firstError ? (
              <div ref={firstErrorRef} className="mt-4">
                <SmallError text={firstError} />
              </div>
            ) : (
              <div ref={firstErrorRef} />
            )}

            {/* FORM */}
            <div className="mt-6 space-y-6">
              {/* цель (общая) */}
              <div>
                <div className="text-sm font-medium text-neutral-900">Цель</div>
                <textarea
                  value={(fact as any)?.goal ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFact((prev) => ({ ...(prev as any), goal: v }));
                    // цель сохраняем вместе
                    patchProjectFact({ goal: v } as any);
                  }}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-300"
                  placeholder="Например: увеличить заявки и выручку за 3–6 месяцев"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    Название компании
                  </div>
                  <input
                    value={draft.projectName}
                    onChange={(e) =>
                      setDraft({ ...draft, projectName: e.target.value })
                    }
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                      errors.projectName
                        ? "border-red-300 bg-red-50"
                        : "border-neutral-200 bg-white focus:border-neutral-300"
                    }`}
                    placeholder="Например: METLAB"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    Ниша / направление
                  </div>
                  <input
                    value={draft.niche}
                    onChange={(e) => setDraft({ ...draft, niche: e.target.value })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                      errors.niche
                        ? "border-red-300 bg-red-50"
                        : "border-neutral-200 bg-white focus:border-neutral-300"
                    }`}
                    placeholder="Например: маркетинговое агентство"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    Город / регион
                  </div>
                  <input
                    value={draft.geo}
                    onChange={(e) => setDraft({ ...draft, geo: e.target.value })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                      errors.geo
                        ? "border-red-300 bg-red-50"
                        : "border-neutral-200 bg-white focus:border-neutral-300"
                    }`}
                    placeholder="Например: Казань"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-900">Форма</div>
                  <select
                    value={draft.legalForm}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        legalForm: e.target.value as any,
                      })
                    }
                    className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-300"
                  >
                    <option value="ИП">ИП</option>
                    <option value="ООО">ООО</option>
                    <option value="Самозанятый">Самозанятый</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
              </div>

              {/* формат */}
              <div>
                <div className="text-sm font-medium text-neutral-900">Формат работы</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Онлайн", "Офлайн", "Смешанный"] as const).map((x) => {
                    const active = draft.workFormat === x;
                    return (
                      <button
                        key={x}
                        type="button"
                        onClick={() => setDraft({ ...draft, workFormat: x })}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                        }`}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* средний чек (обязательный) */}
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Средний чек (₽)
                </div>
                <input
                  value={draft.averageCheckNow}
                  onChange={(e) => {
                    const v = onlyDigitsLike(e.target.value);
                    setDraft(syncAverageCheckEverywhere(v, { ...draft, averageCheckNow: v }));
                  }}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                    errors.averageCheckNow
                      ? "border-red-300 bg-red-50"
                      : "border-neutral-200 bg-white focus:border-neutral-300"
                  }`}
                  placeholder="Например: 7 000"
                />
              </div>

              {/* услуги */}
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Основные услуги / продукты
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={draft.servicesText}
                    onChange={(e) =>
                      setDraft({ ...draft, servicesText: e.target.value })
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-300"
                    placeholder="Например: маникюр, стрижки, окрашивание"
                  />
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Перечислите через запятую.
                </div>
              </div>

              {/* точка А и точка Б */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-sm font-semibold text-neutral-900">
                  Точка А и точка Б
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="text-sm font-medium">Сейчас (точка А)</div>

                    <div className="mt-3">
                      <div className="text-xs text-neutral-600">Оборот в месяц (₽)</div>
                      <input
                        value={draft.aRevenue}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            aRevenue: onlyDigitsLike(e.target.value),
                          })
                        }
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                          errors.aRevenue
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200 bg-white focus:border-neutral-300"
                        }`}
                        placeholder="Например: 500 000"
                      />
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-neutral-600">
                        Клиенты / продажи в месяц
                      </div>
                      <input
                        value={draft.aClients}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            aClients: onlyDigitsLike(e.target.value),
                          })
                        }
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                          errors.aClients
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200 bg-white focus:border-neutral-300"
                        }`}
                        placeholder="Например: 40"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="text-sm font-medium">Хочу (точка Б)</div>

                    <div className="mt-3">
                      <div className="text-xs text-neutral-600">Оборот в месяц (₽)</div>
                      <input
                        value={draft.bRevenue}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bRevenue: onlyDigitsLike(e.target.value),
                          })
                        }
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                          errors.bRevenue
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200 bg-white focus:border-neutral-300"
                        }`}
                        placeholder="Например: 1 500 000"
                      />
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-neutral-600">
                        Клиенты / продажи в месяц
                      </div>
                      <input
                        value={draft.bClients}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bClients: onlyDigitsLike(e.target.value),
                          })
                        }
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                          errors.bClients
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200 bg-white focus:border-neutral-300"
                        }`}
                        placeholder="Например: 120"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-neutral-600">
                  Эти поля нужны, чтобы «Кнопка» показывала динамику и путь от текущих цифр к желаемым.
                </div>
              </div>

              {/* цели (чекбоксы) */}
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Цели на ближайшие 3–6 месяцев
                </div>

                <div className="mt-3 space-y-3">
                  {/* Больше заявок */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={draft.goals.more_leads}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          goals: { ...draft.goals, more_leads: e.target.checked },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-neutral-900">Больше заявок</div>
                      {draft.goals.more_leads ? (
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-neutral-600">
                              Сколько сейчас (в месяц)
                            </div>
                            <input
                              value={draft.goal_more_leads_now}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  goal_more_leads_now: onlyDigitsLike(e.target.value),
                                })
                              }
                              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                                errors.goal_more_leads_now
                                  ? "border-red-300 bg-red-50"
                                  : "border-neutral-200 bg-white focus:border-neutral-300"
                              }`}
                              placeholder="Например: 40"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-neutral-600">
                              Сколько хотите (в месяц)
                            </div>
                            <input
                              value={draft.goal_more_leads_want}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  goal_more_leads_want: onlyDigitsLike(e.target.value),
                                })
                              }
                              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                                errors.goal_more_leads_want
                                  ? "border-red-300 bg-red-50"
                                  : "border-neutral-200 bg-white focus:border-neutral-300"
                              }`}
                              placeholder="Например: 120"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </label>

                  {/* Повысить средний чек */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={draft.goals.avg_check_up}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          goals: { ...draft.goals, avg_check_up: e.target.checked },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-neutral-900">
                        Повысить средний чек
                      </div>

                      {draft.goals.avg_check_up ? (
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-neutral-600">
                              Сейчас (подтягивается)
                            </div>
                            <input
                              value={draft.averageCheckNow}
                              onChange={(e) => {
                                const v = onlyDigitsLike(e.target.value);
                                setDraft(syncAverageCheckEverywhere(v, { ...draft, averageCheckNow: v }));
                              }}
                              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                                errors.averageCheckNow
                                  ? "border-red-300 bg-red-50"
                                  : "border-neutral-200 bg-white focus:border-neutral-300"
                              }`}
                              placeholder="Например: 7 000"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-neutral-600">
                              Хочу (точка Б)
                            </div>
                            <input
                              value={draft.goal_avg_check_want}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  goal_avg_check_want: onlyDigitsLike(e.target.value),
                                })
                              }
                              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                                errors.goal_avg_check_want
                                  ? "border-red-300 bg-red-50"
                                  : "border-neutral-200 bg-white focus:border-neutral-300"
                              }`}
                              placeholder="Например: 12 000"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </label>

                  {/* Разобраться с маркетингом */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={draft.goals.marketing_understand}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          goals: {
                            ...draft.goals,
                            marketing_understand: e.target.checked,
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-neutral-900">
                        Разобраться с маркетингом
                      </div>
                      {draft.goals.marketing_understand ? (
                        <div className="mt-2">
                          <div className="text-xs text-neutral-600">
                            Опишите проблему и что хотите получить
                          </div>
                          <textarea
                            value={draft.goal_marketing_comment}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                goal_marketing_comment: e.target.value,
                              })
                            }
                            rows={4}
                            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                              errors.goal_marketing_comment
                                ? "border-red-300 bg-red-50"
                                : "border-neutral-200 bg-white focus:border-neutral-300"
                            }`}
                            placeholder="Например: нет системного привлечения, не понимаю какие каналы дают результат…"
                          />
                        </div>
                      ) : null}
                    </div>
                  </label>

                  {/* Аналитика */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={draft.goals.analytics_order}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          goals: {
                            ...draft.goals,
                            analytics_order: e.target.checked,
                          },
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-neutral-900">
                        Навести порядок в аналитике
                      </div>
                      {draft.goals.analytics_order ? (
                        <div className="mt-2">
                          <div className="text-xs text-neutral-600">
                            Опишите, что сейчас не так
                          </div>
                          <textarea
                            value={draft.goal_analytics_comment}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                goal_analytics_comment: e.target.value,
                              })
                            }
                            rows={4}
                            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                              errors.goal_analytics_comment
                                ? "border-red-300 bg-red-50"
                                : "border-neutral-200 bg-white focus:border-neutral-300"
                            }`}
                            placeholder="Например: нет метки, не понимаю откуда заявки, нет сквозной…"
                          />
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/app/onboarding/step-1")}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
              >
                Назад
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
                >
                  Сохранить
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className={`rounded-full px-5 py-2 text-sm font-medium text-white ${
                    canGoNext ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600/40"
                  }`}
                >
                  Далее: каналы
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 self-start">
            <div className="text-lg font-semibold">Что важно</div>
            <div className="mt-3 space-y-3 text-sm text-neutral-600">
              <p>
                Это базовая карточка бизнеса — она влияет на рекомендации,
                приоритеты и подсказки.
              </p>
              <p>
                Обязательные поля: название, ниша, регион, средний чек и блок
                «Точка А → Точка Б».
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              Подсказка: если отметили цель — заполните поле под ней, иначе
              сохранить не получится.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
