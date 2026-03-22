"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepsNav from "@/app/components/OnboardingStepsNav";
import SaveToast from "@/app/components/SaveToast";
import {
  loadProjectFact,
  patchProjectFact,
  setLastStep,
  type Integration,
  type IntegrationGroup,
  type IntegrationStatus,
} from "@/app/app/lib/projectFact";

type TabKey = "connect" | "about" | "howto";

type ConnectField = {
  key: string;
  label: string;
  placeholder: string;
  help?: string;
};

type SystemMeta = {
  title: string;
  subtitle: string;
  siteUrl?: string;
  connectFields: ConnectField[];
  description: string;
  instruction: string[];
};

const META: Record<string, SystemMeta> = {
  "Яндекс.Метрика": {
    title: "Яндекс.Метрика",
    subtitle: "Сервис веб-аналитики от Яндекса",
    siteUrl: "https://metrika.yandex.ru/",
    connectFields: [
      {
        key: "counterId",
        label: "Номер счётчика",
        placeholder: "12345678",
        help: "Номер можно найти в настройках счётчика Метрики.",
      },
    ],
    description:
      "Яндекс.Метрика собирает данные о посещениях сайта, источниках трафика и поведении пользователей. «Кнопка» будет использовать Метрику для сводки по трафику и конверсиям.",
    instruction: [
      "Откройте Яндекс.Метрику и выберите нужный счётчик.",
      "Перейдите в настройки счётчика и найдите его номер.",
      "Вставьте номер счётчика в поле «Номер счётчика».",
      "Нажмите «Подключить».",
    ],
  },

  "Google Analytics": {
    title: "Google Аналитика",
    subtitle: "Бесплатный сервис аналитики от Google",
    siteUrl: "https://analytics.google.com/",
    connectFields: [
      {
        key: "measurementId",
        label: "Номер счётчика",
        placeholder: "G-XXXXXXXXXX",
        help: "Это Measurement ID. Обычно начинается с G-",
      },
    ],
    description:
      "Google Analytics позволяет собирать статистику посещений и событий. «Кнопка» использует эти данные для анализа трафика, конверсий и эффективности каналов.",
    instruction: [
      "Откройте Google Analytics и выберите нужный ресурс.",
      "Перейдите в «Администратор» → «Потоки данных».",
      "Откройте поток «Веб» и скопируйте Measurement ID (G-...).",
      "Вставьте ID в поле и нажмите «Подключить».",
    ],
  },

  "amoCRM": {
    title: "amoCRM",
    subtitle: "CRM для продаж и заявок",
    siteUrl: "https://www.amocrm.ru/",
    connectFields: [
      {
        key: "domain",
        label: "Домен аккаунта",
        placeholder: "primer.amocrm.ru",
        help: "Можно указать домен или поддомен вашего аккаунта.",
      },
    ],
    description:
      "amoCRM хранит заявки, сделки и статусы. После подключения «Кнопка» сможет связать каналы и заявки, а затем считать эффективность и окупаемость.",
    instruction: [
      "Укажите домен вашего аккаунта amoCRM (например, primer.amocrm.ru).",
      "Нажмите «Подключить».",
      "Дальше «Кнопка» покажет шаги по выдаче доступа (токен/ключи) на следующем этапе интеграции.",
    ],
  },

  Bitrix24: {
    title: "Bitrix24",
    subtitle: "CRM и задачи",
    siteUrl: "https://www.bitrix24.ru/",
    connectFields: [
      {
        key: "portal",
        label: "Адрес портала",
        placeholder: "primer.bitrix24.ru",
        help: "Укажите адрес вашего портала Bitrix24.",
      },
    ],
    description:
      "Bitrix24 хранит заявки, сделки и коммуникации. Подключение нужно, чтобы «Кнопка» считала эффективность каналов и понимала путь клиента.",
    instruction: [
      "Укажите адрес вашего портала Bitrix24 (пример: primer.bitrix24.ru).",
      "Нажмите «Подключить».",
      "Дальше «Кнопка» покажет шаги по выдаче доступа на следующем этапе интеграции.",
    ],
  },

  Yclients: {
    title: "Yclients",
    subtitle: "CRM для услуг и записи клиентов",
    siteUrl: "https://www.yclients.com/",
    connectFields: [
      {
        key: "companyId",
        label: "ID компании",
        placeholder: "Например: 12345",
        help: "Если не знаете — можно оставить пустым и подключить позже.",
      },
    ],
    description:
      "Yclients помогает учитывать записи, визиты и выручку. Подключение нужно, чтобы «Кнопка» видела заявки и фактическую выручку по каналам.",
    instruction: [
      "Укажите ID компании (если знаете).",
      "Нажмите «Подключить».",
      "Если данных нет — можно пропустить и вернуться позже.",
    ],
  },

  "Яндекс.Директ": {
    title: "Яндекс.Директ",
    subtitle: "Рекламный кабинет",
    siteUrl: "https://direct.yandex.ru/",
    connectFields: [
      {
        key: "login",
        label: "Логин кабинета",
        placeholder: "primer_company",
        help: "Укажите логин, под которым ведётся реклама.",
      },
    ],
    description:
      "Яндекс.Директ — источник данных о расходах, кликах и кампаниях. «Кнопка» будет сопоставлять эти данные с заявками и выручкой.",
    instruction: [
      "Укажите логин рекламного кабинета.",
      "Нажмите «Подключить».",
      "Дальше «Кнопка» покажет, как дать доступ по инструкции.",
    ],
  },

  "VK Реклама": {
    title: "VK Реклама",
    subtitle: "Рекламный кабинет VK",
    siteUrl: "https://ads.vk.com/",
    connectFields: [
      {
        key: "account",
        label: "ID кабинета",
        placeholder: "Например: 123456",
      },
    ],
    description:
      "VK Реклама — данные о расходах и кампаниях. Подключение нужно, чтобы видеть эффективность трафика и сравнивать с заявками.",
    instruction: [
      "Укажите ID кабинета (если знаете).",
      "Нажмите «Подключить».",
      "Если не знаете — можно подключить позже.",
    ],
  },

  "Telegram Ads / другое": {
    title: "Telegram Ads",
    subtitle: "Рекламный кабинет Telegram",
    connectFields: [
      {
        key: "note",
        label: "Комментарий",
        placeholder: "Например: рекламируем канал @primer_salon",
      },
    ],
    description:
      "Telegram Ads — источник данных о расходах и переходах. Подключение нужно, чтобы сравнивать стоимость привлечения с результатами.",
    instruction: [
      "Добавьте комментарий (необязательно).",
      "Нажмите «Подключить».",
    ],
  },

  "Сквозная аналитика / Roistat / другое": {
    title: "Сквозная аналитика",
    subtitle: "Roistat / другие системы",
    connectFields: [
      {
        key: "service",
        label: "Название системы",
        placeholder: "Например: Roistat",
      },
      {
        key: "account",
        label: "ID / домен",
        placeholder: "Например: primer.roistat.com",
      },
    ],
    description:
      "Сквозная аналитика связывает расходы, заявки и выручку. Подключение помогает быстро считать окупаемость по каналам.",
    instruction: [
      "Укажите название системы и ID/домен (если есть).",
      "Нажмите «Подключить».",
    ],
  },

  "Другая CRM / таблица": {
    title: "Другая CRM / таблица",
    subtitle: "Любая система учёта заявок",
    connectFields: [
      {
        key: "system",
        label: "Название системы",
        placeholder: "Например: 1С / таблица / своя CRM",
      },
      {
        key: "link",
        label: "Ссылка (если есть)",
        placeholder: "https://...",
      },
    ],
    description:
      "Если CRM нестандартная — «Кнопка» зафиксирует систему учёта и позже предложит простой путь подключения.",
    instruction: [
      "Укажите название системы (и ссылку, если есть).",
      "Нажмите «Подключить».",
    ],
  },
};

function statusLabel(s: IntegrationStatus) {
  if (s === "configured") return { text: "Подключено", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (s === "connected") return { text: "Подключено", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { text: "Не подключено", pill: "bg-neutral-50 text-neutral-700 border-neutral-200" };
}

function actionLabel(s: IntegrationStatus) {
  if (s === "configured") return { text: "Настроено", disabled: true };
  if (s === "connected") return { text: "Настроить", disabled: false };
  return { text: "Подключить", disabled: false };
}

function groupTitle(g: IntegrationGroup) {
  if (g === "crm") return "CRM и учёт заявок";
  if (g === "analytics") return "Аналитика и трафик";
  if (g === "ads") return "Рекламные кабинеты";
  if (g === "marketplaces") return "Маркетплейсы";
  return "Поиск и SEO";
}

export default function Step3SystemsPage() {
  const router = useRouter();
  const [toast, setToast] = useState(false);

  const [items, setItems] = useState<Integration[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("connect");

  const active = useMemo(
    () => items.find((x) => x.id === activeId) ?? null,
    [items, activeId]
  );

  const meta = useMemo<SystemMeta | null>(() => {
    if (!active) return null;
    return META[active.title] ?? {
      title: active.title,
      subtitle: "Система для подключения",
      connectFields: [
        { key: "note", label: "Комментарий", placeholder: "Например: данные доступа / примечание" },
      ],
      description:
        "Подключение нужно, чтобы «Кнопка» автоматически подтягивала данные и строила аналитику.",
      instruction: ["Заполните поле (если нужно) и нажмите «Подключить».", "Если данных нет — можно подключить позже."],
    };
  }, [active]);

  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const f = loadProjectFact();
    setItems(Array.isArray(f.integrations) ? f.integrations : []);
  }, []);

  useEffect(() => {
    if (!active) return;
    setDraft(active.settings ?? {});
    setTab("connect");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSaved = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 1400);
  };

  const save = () => {
    patchProjectFact({ integrations: items });
    setLastStep(3);
    showSaved();
  };

  const openModal = (id: string) => {
    setActiveId(id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveId(null);
    setDraft({});
  };

  const applyConnect = () => {
    if (!active) return;

    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== active.id) return x;

        // если уже было configured — оставляем configured
        const nextStatus: IntegrationStatus =
          x.status === "configured" ? "configured" : "connected";

        return {
          ...x,
          status: nextStatus,
          settings: { ...(x.settings ?? {}), ...draft },
        };
      })
    );

    // сохранить сразу + тост
    window.setTimeout(() => {
      patchProjectFact({
        integrations: items.map((x) =>
          x.id === active.id
            ? {
                ...x,
                status: x.status === "configured" ? "configured" : "connected",
                settings: { ...(x.settings ?? {}), ...draft },
              }
            : x
        ),
      });
      showSaved();
    }, 0);

    closeModal();
  };

  const grouped = useMemo(() => {
    const g: Record<IntegrationGroup, Integration[]> = {
      crm: [],
      analytics: [],
      ads: [],
      marketplaces: [],
      search: [],
    };

    for (const it of items) {
      g[it.group].push(it);
    }
    return g;
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-none px-0">
      <SaveToast open={toast} />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="text-xs text-neutral-500">Шаг 3 из 4</div>
            <div className="mt-1 text-2xl font-semibold">Системы и учёт</div>

            <OnboardingStepsNav currentStep={3} />


            <div className="mt-3 text-sm text-neutral-600">
              Подключите системы, из которых «Кнопка» будет забирать заявки, трафик и выручку.
              Пароли не храним — только доступы по инструкциям.
            </div>

            <div className="mt-6 space-y-8">
              {(Object.keys(grouped) as IntegrationGroup[]).map((group) => {
                const rows = grouped[group];
                if (!rows || rows.length === 0) return null;

                return (
                  <div key={group}>
                    <div className="text-sm font-medium text-neutral-900">
                      {groupTitle(group)}
                    </div>

                    <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-xs text-neutral-600">
                          <tr>
                            <th className="px-4 py-3 text-left">Система</th>
                            <th className="px-4 py-3 text-left w-[180px]">
                              Статус
                            </th>
                            <th className="px-4 py-3 text-right w-[180px]">
                              Действие
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {rows.map((r) => {
                            const st = statusLabel(r.status);
                            const act = actionLabel(r.status);

                            return (
                              <tr
                                key={r.id}
                                className="border-t border-neutral-200"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex h-2 w-2 rounded-full bg-neutral-300" />
                                    <span className="text-neutral-900">
                                      {r.title}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={[
                                      "inline-flex rounded-full border px-3 py-1 text-xs",
                                      st.pill,
                                    ].join(" ")}
                                  >
                                    {st.text}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={act.disabled}
                                    onClick={() => openModal(r.id)}
                                    className={[
                                      "rounded-full px-4 py-2 text-xs font-medium transition",
                                      act.disabled
                                        ? "border border-neutral-200 bg-neutral-100 text-neutral-500"
                                        : "border border-blue-500 bg-white text-blue-700 hover:bg-blue-50",
                                    ].join(" ")}
                                  >
                                    {act.text}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {group === "crm" && (
                      <button
                        type="button"
                        onClick={() => openModal(rows[0].id)}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                      >
                        У меня пока нет CRM — хочу подсказку, с чего начать
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BOTTOM */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/app/onboarding/step-2")}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
              >
                Назад
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
                >
                  Сохранить
                </button>

                <button
                  type="button"
                  onClick={() => {
                    save();
                    router.push("/app/onboarding/step-4");
                  }}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Далее: материалы
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 self-start">
            <div className="text-lg font-semibold">
              Зачем подключать системы сейчас
            </div>

            <div className="mt-3 space-y-3 text-sm text-neutral-600">
              <p>
                После подключения CRM, аналитики и рекламных кабинетов «Кнопка»
                начнёт автоматически подтягивать данные: заявки, трафик, выручку,
                расходы и ошибки.
              </p>
              <p>
                На основе этих цифр платформа будет считать конверсии, стоимость
                заявки и клиента, динамику по каналам и связкам «канал + специалист».
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              Превью: сводный график «заявки — выручка — расходы»
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && active && meta && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[760px] rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100" />
                <div>
                  <div className="text-lg font-semibold">{meta.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {meta.subtitle}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="px-6">
              <div className="flex items-center gap-6 border-b border-neutral-200 text-sm">
                <button
                  type="button"
                  onClick={() => setTab("connect")}
                  className={[
                    "pb-3",
                    tab === "connect"
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-500",
                  ].join(" ")}
                >
                  Подключение
                </button>
                <button
                  type="button"
                  onClick={() => setTab("about")}
                  className={[
                    "pb-3",
                    tab === "about"
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-500",
                  ].join(" ")}
                >
                  Описание
                </button>
                <button
                  type="button"
                  onClick={() => setTab("howto")}
                  className={[
                    "pb-3",
                    tab === "howto"
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-500",
                  ].join(" ")}
                >
                  Инструкция
                </button>

                <div className="ml-auto pb-3">
                  {meta.siteUrl && (
                    <a
                      href={meta.siteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-500 hover:text-neutral-900"
                    >
                      Перейти на сайт
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {tab === "connect" && (
                <div className="space-y-4">
                  {meta.connectFields.map((f) => (
                    <div key={f.key}>
                      <div className="text-sm font-medium text-neutral-900">
                        {f.label}
                      </div>
                      <input
                        value={draft[f.key] ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [f.key]: e.target.value,
                          }))
                        }
                        placeholder={f.placeholder}
                        className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                      {f.help && (
                        <div className="mt-1 text-xs text-neutral-500">
                          {f.help}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={applyConnect}
                      className="w-[240px] rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Подключить
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-[240px] rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm hover:bg-neutral-50"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {tab === "about" && (
                <div className="text-sm text-neutral-700 leading-relaxed">
                  {meta.description}
                </div>
              )}

              {tab === "howto" && (
                <div className="space-y-2 text-sm text-neutral-700">
                  {meta.instruction.map((line, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="mt-[2px] text-neutral-400">
                        {idx + 1}.
                      </div>
                      <div>{line}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
