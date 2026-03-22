"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepsNav from "@/app/components/OnboardingStepsNav";
import SaveToast from "@/app/components/SaveToast";
import {
  loadProjectFact,
  patchProjectFact,
  setLastStep,
  toggleInArray,
  type ChannelBudgetRow,
  type SpecialistCostRow,
  type PlatformLinks,
} from "@/app/app/lib/projectFact";

function uid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function numFromInput(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const HAS_OPTIONS = [
  "Сайт",
  "Telegram-канал",
  "Instagram",
  "VK-группа",
  "Яндекс.Карты / Бизнес",
  "Маркетплейсы",
  "Авито",
  "Другое",
] as const;

type HasOption = (typeof HAS_OPTIONS)[number];

export default function Step2ChannelsPage() {
  const router = useRouter();
  const [toast, setToast] = useState(false);

  const [connected, setConnected] = useState<string[]>([]);
  const [links, setLinks] = useState<PlatformLinks>({
    site: "",
    telegram: "",
    instagram: "",
    vk: "",
    yandexMaps: "",
    yandexBusiness: "",
    avito: "",
    marketplaces: "",
    other: "",
  });

  const [channelBudgets, setChannelBudgets] = useState<ChannelBudgetRow[]>([]);
  const [specialistCosts, setSpecialistCosts] = useState<SpecialistCostRow[]>(
    []
  );

  useEffect(() => {
    const f = loadProjectFact();

    setConnected(f.channels?.connected ?? []);

    setLinks(
      f.platformLinks ?? {
        site: "",
        telegram: "",
        instagram: "",
        vk: "",
        yandexMaps: "",
        yandexBusiness: "",
        avito: "",
        marketplaces: "",
        other: "",
      }
    );

    setChannelBudgets(
      Array.isArray(f.channelBudgets) && f.channelBudgets.length > 0
        ? f.channelBudgets
        : [
            { id: uid(), channel: "Сайт / лендинг", budget: 0 },
            { id: uid(), channel: "Соцсети (все)", budget: 0 },
            { id: uid(), channel: "Яндекс.Директ / поиск", budget: 0 },
            { id: uid(), channel: "Авито", budget: 0 },
          ]
    );

    setSpecialistCosts(
      Array.isArray(f.specialistCosts) && f.specialistCosts.length > 0
        ? f.specialistCosts
        : [
            { id: uid(), role: "Маркетолог / руководитель маркетинга", cost: 0 },
            { id: uid(), role: "SMM-специалист", cost: 0 },
            { id: uid(), role: "Настройщик рекламы / трафик-менеджер", cost: 0 },
          ]
    );
  }, []);

  const showSaved = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 1400);
  };

  const save = () => {
    patchProjectFact({
      channels: { connected, planned: [] },
      platformLinks: links,
      channelBudgets,
      specialistCosts,
    });
    setLastStep(2);
    showSaved();
  };

  const nextEnabled = useMemo(() => true, []);

  const updateLink = (key: keyof PlatformLinks, value: string) => {
    setLinks((prev) => ({ ...prev, [key]: value }));
  };

  const addBudgetRow = () => {
    setChannelBudgets((prev) => [
      ...prev,
      { id: uid(), channel: "", budget: 0 },
    ]);
  };

  const deleteBudgetRow = (id: string) => {
    setChannelBudgets((prev) => prev.filter((r) => r.id !== id));
  };

  const addSpecialistRow = () => {
    setSpecialistCosts((prev) => [
      ...prev,
      { id: uid(), role: "", cost: 0 },
    ]);
  };

  const deleteSpecialistRow = (id: string) => {
    setSpecialistCosts((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-none px-0">
      <SaveToast open={toast} />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="text-xs text-neutral-500">Шаг 2 из 4</div>
            <div className="mt-1 text-2xl font-semibold">Каналы и площадки</div>

            <OnboardingStepsNav currentStep={2} />

            <div className="mt-6 space-y-8">
              {/* WHAT YOU HAVE */}
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Что у вас уже есть
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {HAS_OPTIONS.map((label) => (
                    <label key={label} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={connected.includes(label)}
                        onChange={() =>
                          setConnected(toggleInArray(connected, label))
                        }
                      />
                      <span className="text-sm text-neutral-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* LINKS */}
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Ссылки на площадки
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-xs text-neutral-600">Сайт</div>
                    <input
                      value={links.site}
                      onChange={(e) => updateLink("site", e.target.value)}
                      placeholder="https://primer-salon.ru"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">Telegram-канал</div>
                    <input
                      value={links.telegram}
                      onChange={(e) => updateLink("telegram", e.target.value)}
                      placeholder="https://t.me/primer_salon"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">Instagram</div>
                    <input
                      value={links.instagram}
                      onChange={(e) => updateLink("instagram", e.target.value)}
                      placeholder="@primer_salon"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">VK-группа</div>
                    <input
                      value={links.vk}
                      onChange={(e) => updateLink("vk", e.target.value)}
                      placeholder="https://vk.com/primer_salon"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">
                      Яндекс.Карты / Бизнес
                    </div>
                    <input
                      value={links.yandexMaps}
                      onChange={(e) => updateLink("yandexMaps", e.target.value)}
                      placeholder="Ссылка на профиль или название организации"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">Авито</div>
                    <input
                      value={links.avito}
                      onChange={(e) => updateLink("avito", e.target.value)}
                      placeholder="Ссылка на профиль или главное объявление"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">
                      Маркетплейсы / другое
                    </div>
                    <input
                      value={links.marketplaces}
                      onChange={(e) =>
                        updateLink("marketplaces", e.target.value)
                      }
                      placeholder="Ozon / WB / другие ссылки"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-neutral-600">Другое</div>
                    <input
                      value={links.other}
                      onChange={(e) => updateLink("other", e.target.value)}
                      placeholder="Любые ссылки"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* BUDGETS */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-neutral-900">
                    Рекламные бюджеты по каналам (₽/мес)
                  </div>
                  <button
                    type="button"
                    onClick={addBudgetRow}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Добавить канал
                  </button>
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-xs text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Канал</th>
                        <th className="px-4 py-3 text-left w-[180px]">
                          Бюджет
                        </th>
                        <th className="px-4 py-3 text-right w-[120px]">
                          Действие
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelBudgets.map((row) => (
                        <tr key={row.id} className="border-t border-neutral-200">
                          <td className="px-4 py-3">
                            <input
                              value={row.channel}
                              onChange={(e) => {
                                const v = e.target.value;
                                setChannelBudgets((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, channel: v } : r
                                  )
                                );
                              }}
                              placeholder="Например: Яндекс.Директ"
                              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={String(row.budget ?? 0)}
                              onChange={(e) => {
                                const n = numFromInput(e.target.value);
                                setChannelBudgets((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, budget: n } : r
                                  )
                                );
                              }}
                              placeholder="0"
                              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteBudgetRow(row.id)}
                              className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs hover:bg-neutral-50"
                              title="Удалить строку"
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                      {channelBudgets.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-6 text-center text-sm text-neutral-500"
                          >
                            Добавьте канал и бюджет
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SPECIALISTS */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-neutral-900">
                    Расходы на специалистов (₽/мес)
                  </div>
                  <button
                    type="button"
                    onClick={addSpecialistRow}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    Добавить специалиста
                  </button>
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-xs text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Специалист</th>
                        <th className="px-4 py-3 text-left w-[180px]">
                          Расход
                        </th>
                        <th className="px-4 py-3 text-right w-[120px]">
                          Действие
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialistCosts.map((row) => (
                        <tr key={row.id} className="border-t border-neutral-200">
                          <td className="px-4 py-3">
                            <input
                              value={row.role}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSpecialistCosts((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, role: v } : r
                                  )
                                );
                              }}
                              placeholder="Например: дизайнер"
                              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={String(row.cost ?? 0)}
                              onChange={(e) => {
                                const n = numFromInput(e.target.value);
                                setSpecialistCosts((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, cost: n } : r
                                  )
                                );
                              }}
                              placeholder="0"
                              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteSpecialistRow(row.id)}
                              className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs hover:bg-neutral-50"
                              title="Удалить строку"
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                      {specialistCosts.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-6 text-center text-sm text-neutral-500"
                          >
                            Добавьте специалиста и расход
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* BOTTOM */}
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
                  onClick={save}
                  className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
                >
                  Сохранить
                </button>

                <button
                  type="button"
                  onClick={() => {
                    save();
                    router.push("/app/onboarding/step-3");
                  }}
                  disabled={!nextEnabled}
                  className={[
                    "rounded-full px-5 py-2 text-sm font-medium transition",
                    nextEnabled
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-neutral-200 text-neutral-500",
                  ].join(" ")}
                >
                  Далее: системы
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 self-start">
            <div className="text-lg font-semibold">
              Как «Кнопка» разделяет бюджеты
            </div>

            <div className="mt-3 text-sm text-neutral-600 space-y-3">
              <p>
                Мы отдельно считаем рекламный бюджет по каналам и расходы на
                специалистов. Это даёт честную картину: сколько стоит не только
                трафик, но и работа людей.
              </p>
              <p>
                Платформа сравнит бюджеты по каналам с заявками и выручкой из
                аналитики и CRM.
              </p>
              <p>
                Вознаграждения специалистов «Кнопка» добавит сверху и посчитает
                общую стоимость привлечения клиента по каждому каналу и в целом.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              Превью: график «каналы vs специалисты» по затратам
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
