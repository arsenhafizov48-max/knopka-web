"use client";

import { useEffect, useMemo, useState } from "react";
import SaveToast from "@/app/components/SaveToast";
import FileUploadBlock from "@/app/app/components/FileUploadBlock";
import {
  loadProjectFact,
  patchProjectFact,
  normalizeText,
} from "@/app/app/lib/projectFact";

type Fact = ReturnType<typeof loadProjectFact>;

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toNum(v: any) {
  const s = String(v ?? "").replace(/\s/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function FactPage() {
  const [toast, setToast] = useState(false);
  const [fact, setFact] = useState<Fact>(() => loadProjectFact());

  const [projectName, setProjectName] = useState("");
  const [niche, setNiche] = useState("");
  const [geo, setGeo] = useState("");
  const [goalText, setGoalText] = useState("");

  const [avgCheckNow, setAvgCheckNow] = useState("");

  const [aRevenue, setARevenue] = useState("");
  const [aClients, setAClients] = useState("");
  const [bRevenue, setBRevenue] = useState("");
  const [bClients, setBClients] = useState("");

  const [goals, setGoals] = useState<Record<string, boolean>>({
    more_leads: false,
    avg_check_up: false,
    marketing_understand: false,
    analytics_order: false,
  });

  const [moreLeadsNow, setMoreLeadsNow] = useState("");
  const [moreLeadsWant, setMoreLeadsWant] = useState("");
  const [avgCheckWant, setAvgCheckWant] = useState("");
  const [marketingComment, setMarketingComment] = useState("");
  const [analyticsComment, setAnalyticsComment] = useState("");

  const [channelBudgets, setChannelBudgets] = useState<any[]>([]);
  const [specialistCosts, setSpecialistCosts] = useState<any[]>([]);

  const [commercialFiles, setCommercialFiles] = useState<string[]>([]);
  const [priceFiles, setPriceFiles] = useState<string[]>([]);
  const [brandFiles, setBrandFiles] = useState<string[]>([]);
  const [aiComment, setAiComment] = useState("");

  useEffect(() => {
    const f: any = loadProjectFact();
    setFact(f);

    setProjectName(String(f?.projectName ?? ""));
    setNiche(String(f?.niche ?? ""));
    setGeo(String(f?.geo ?? ""));
    setGoalText(String(f?.goal ?? ""));

    setAvgCheckNow(String(f?.economics?.averageCheck ?? ""));

    const pA = f?.pointA ?? {};
    const pB = f?.pointB ?? {};
    setARevenue(String(pA?.revenue ?? f?.currentRevenue ?? ""));
    setAClients(String(pA?.clients ?? f?.currentClients ?? ""));
    setBRevenue(String(pB?.revenue ?? f?.targetRevenue ?? ""));
    setBClients(String(pB?.clients ?? f?.targetClients ?? ""));

    const gArr: string[] = Array.isArray(f?.goals) ? f.goals : [];
    setGoals({
      more_leads: gArr.includes("more_leads"),
      avg_check_up: gArr.includes("avg_check_up"),
      marketing_understand: gArr.includes("marketing_understand"),
      analytics_order: gArr.includes("analytics_order"),
    });

    const gd = f?.goalDetails ?? {};
    setMoreLeadsNow(String(gd?.moreLeadsNow ?? ""));
    setMoreLeadsWant(String(gd?.moreLeadsWant ?? ""));
    setAvgCheckWant(String(gd?.avgCheckWant ?? ""));
    setMarketingComment(String(gd?.marketingComment ?? ""));
    setAnalyticsComment(String(gd?.analyticsComment ?? ""));

    setChannelBudgets(Array.isArray(f?.channelBudgets) ? f.channelBudgets : []);
    setSpecialistCosts(
      Array.isArray(f?.specialistCosts) ? f.specialistCosts : []
    );

    const m = f?.materials ?? {};
    setCommercialFiles(
      Array.isArray(m?.commercialFiles) ? m.commercialFiles : []
    );
    setPriceFiles(Array.isArray(m?.priceFiles) ? m.priceFiles : []);
    setBrandFiles(Array.isArray(m?.brandFiles) ? m.brandFiles : []);
    setAiComment(String(m?.aiComment ?? ""));
  }, []);

  const selectedGoals = useMemo(() => {
    return Object.entries(goals)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }, [goals]);

  function showSaved() {
    setToast(true);
    window.setTimeout(() => setToast(false), 1200);
  }

  function saveAll() {
    const patch: any = {
      projectName: normalizeText(projectName),
      niche: normalizeText(niche),
      geo: normalizeText(geo),
      goal: goalText,

      economics: {
        ...(fact as any)?.economics,
        averageCheck: avgCheckNow,
      },

      currentRevenue: aRevenue,
      currentClients: aClients,
      targetRevenue: bRevenue,
      targetClients: bClients,

      pointA: {
        revenue: aRevenue,
        clients: aClients,
        averageCheck: avgCheckNow,
      },
      pointB: {
        revenue: bRevenue,
        clients: bClients,
        averageCheck: goals.avg_check_up ? avgCheckWant : "",
      },

      goals: selectedGoals,

      goalDetails: {
        moreLeadsNow,
        moreLeadsWant,
        avgCheckWant,
        marketingComment,
        analyticsComment,
      },

      channelBudgets,
      specialistCosts,

      materials: {
        commercialFiles,
        priceFiles,
        brandFiles,
        aiComment,
      },
    };

    patchProjectFact(patch);
    setFact(loadProjectFact());
    showSaved();
  }

  return (
    <div className="min-h-screen bg-[#F4F7FF] px-6 py-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <SaveToast
          open={toast}
          onClose={() => setToast(false)}
          title="Сохранено"
          description="Фактура обновлена"
        />

        {/* Шапка без лишних контейнеров */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-neutral-500">Фактура</div>
            <div className="mt-1 text-2xl font-semibold">
              Данные проекта (редактирование)
            </div>
            <div className="mt-2 text-sm text-neutral-600">
              Здесь можно менять данные в любой момент: обновить, удалить,
              добавить.
            </div>
          </div>

          <button
            type="button"
            onClick={saveAll}
            className="h-11 rounded-full bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Сохранить изменения
          </button>
        </div>

        {/* Сетка: бизнес шире (2/3), цели уже (1/3) */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Бизнес */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="text-sm font-medium text-neutral-900">Бизнес</div>
            <div className="mt-1 text-xs text-neutral-500">
              База проекта + цель + чек + точка A/B
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <div className="text-xs text-neutral-500">Название</div>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-300"
                    placeholder="Например: METLAB"
                  />
                </label>

                <label className="block">
                  <div className="text-xs text-neutral-500">Ниша</div>
                  <input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-300"
                    placeholder="Например: маркетинговое агентство"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-xs text-neutral-500">Город / регион</div>
                  <input
                    value={geo}
                    onChange={(e) => setGeo(e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-300"
                    placeholder="Например: Казань"
                  />
                </label>

                {/* Цель — широкая */}
                <label className="block md:col-span-2">
                  <div className="text-xs text-neutral-500">Цель</div>
                  <textarea
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    className="mt-1 min-h-[130px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-300"
                    placeholder="Опишите цель проекта текстом"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-xs text-neutral-500">
                    Средний чек (сейчас)
                  </div>
                  <input
                    value={avgCheckNow}
                    onChange={(e) => setAvgCheckNow(e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-300"
                    placeholder="Например: 150 000"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Сейчас (точка A)
                  </div>
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Выручка в месяц
                      </div>
                      <input
                        value={aRevenue}
                        onChange={(e) => setARevenue(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Клиенты / продажи в месяц
                      </div>
                      <input
                        value={aClients}
                        onChange={(e) => setAClients(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Цель (точка B)
                  </div>
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Выручка в месяц
                      </div>
                      <input
                        value={bRevenue}
                        onChange={(e) => setBRevenue(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Клиенты / продажи в месяц
                      </div>
                      <input
                        value={bClients}
                        onChange={(e) => setBClients(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Цели */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="text-sm font-medium text-neutral-900">Цели</div>
            <div className="mt-1 text-xs text-neutral-500">
              Выбор целей + детали, которые должен видеть GPT
            </div>

            <div className="mt-4 space-y-3">
              {[
                ["more_leads", "Больше заявок"],
                ["avg_check_up", "Повысить средний чек"],
                ["marketing_understand", "Разобраться с маркетингом"],
                ["analytics_order", "Навести порядок в аналитике"],
              ].map(([id, title]) => (
                <label
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={Boolean((goals as any)[id])}
                    onChange={(e) =>
                      setGoals((p) => ({ ...p, [id]: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-neutral-900">{title}</span>
                </label>
              ))}

              {goals.more_leads ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Больше заявок
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Сколько сейчас (в месяц)
                      </div>
                      <input
                        value={moreLeadsNow}
                        onChange={(e) => setMoreLeadsNow(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-neutral-500">
                        Сколько хотите (в месяц)
                      </div>
                      <input
                        value={moreLeadsWant}
                        onChange={(e) => setMoreLeadsWant(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {goals.avg_check_up ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Повысить средний чек
                  </div>
                  <label className="mt-3 block">
                    <div className="text-xs text-neutral-500">
                      Хочу (средний чек)
                    </div>
                    <input
                      value={avgCheckWant}
                      onChange={(e) => setAvgCheckWant(e.target.value)}
                      className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                    />
                  </label>
                </div>
              ) : null}

              {goals.marketing_understand ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Разобраться с маркетингом
                  </div>
                  <label className="mt-3 block">
                    <div className="text-xs text-neutral-500">Комментарий</div>
                    <textarea
                      value={marketingComment}
                      onChange={(e) => setMarketingComment(e.target.value)}
                      className="mt-1 min-h-[80px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              ) : null}

              {goals.analytics_order ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-medium text-neutral-900">
                    Навести порядок в аналитике
                  </div>
                  <label className="mt-3 block">
                    <div className="text-xs text-neutral-500">Комментарий</div>
                    <textarea
                      value={analyticsComment}
                      onChange={(e) => setAnalyticsComment(e.target.value)}
                      className="mt-1 min-h-[80px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {/* Каналы */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Каналы (реклама)
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Название канала + бюджет
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setChannelBudgets((p) => [
                    ...p,
                    { id: uid(), channel: "Новый канал", budget: 0 },
                  ])
                }
                className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm hover:bg-neutral-50"
              >
                Добавить
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {channelBudgets.map((r, idx) => (
                <div
                  key={r.id ?? idx}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block sm:col-span-2">
                      <div className="text-xs text-neutral-500">Канал</div>
                      <input
                        value={String(r.channel ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setChannelBudgets((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, channel: v } : x
                            )
                          );
                        }}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs text-neutral-500">Бюджет</div>
                      <input
                        value={String(r.budget ?? 0)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setChannelBudgets((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, budget: toNum(v) } : x
                            )
                          );
                        }}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setChannelBudgets((p) => p.filter((_, i) => i !== idx))
                      }
                      className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm hover:bg-neutral-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {!channelBudgets.length ? (
                <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
                  Список пуст
                </div>
              ) : null}
            </div>
          </div>

          {/* Специалисты */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  Специалисты
                </div>
                <div className="mt-1 text-xs text-neutral-500">Роль + расход</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSpecialistCosts((p) => [
                    ...p,
                    { id: uid(), role: "Новый специалист", cost: 0 },
                  ])
                }
                className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm hover:bg-neutral-50"
              >
                Добавить
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {specialistCosts.map((r, idx) => (
                <div
                  key={r.id ?? idx}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block">
                      <div className="text-xs text-neutral-500">Роль</div>
                      <input
                        value={String(r.role ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSpecialistCosts((p) =>
                            p.map((x, i) => (i === idx ? { ...x, role: v } : x))
                          );
                        }}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs text-neutral-500">Расход</div>
                      <input
                        value={String(r.cost ?? 0)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSpecialistCosts((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, cost: toNum(v) } : x
                            )
                          );
                        }}
                        className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSpecialistCosts((p) => p.filter((_, i) => i !== idx))
                      }
                      className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm hover:bg-neutral-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {!specialistCosts.length ? (
                <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
                  Список пуст
                </div>
              ) : null}
            </div>
          </div>

          {/* Материалы */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <FileUploadBlock
                title="Коммерческое предложение"
                hint="Загрузите КП, примеры писем, презентации"
                files={commercialFiles}
                onPick={(picked) => {
                  const names = Array.from(picked).map((f) => f.name);
                  setCommercialFiles((p) =>
                    Array.from(new Set([...p, ...names]))
                  );
                }}
                onRemove={(name) =>
                  setCommercialFiles((p) => p.filter((x) => x !== name))
                }
              />

              <FileUploadBlock
                title="Прайсы"
                hint="Прайс-листы, тарифы, типовые расчёты"
                files={priceFiles}
                onPick={(picked) => {
                  const names = Array.from(picked).map((f) => f.name);
                  setPriceFiles((p) => Array.from(new Set([...p, ...names])));
                }}
                onRemove={(name) =>
                  setPriceFiles((p) => p.filter((x) => x !== name))
                }
              />

              <FileUploadBlock
                title="Бренд"
                hint="Логотипы, фирменные цвета, гайд"
                files={brandFiles}
                onPick={(picked) => {
                  const names = Array.from(picked).map((f) => f.name);
                  setBrandFiles((p) => Array.from(new Set([...p, ...names])));
                }}
                onRemove={(name) =>
                  setBrandFiles((p) => p.filter((x) => x !== name))
                }
              />
            </div>

            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-neutral-900">
                Комментарий по материалам
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Любые пояснения: что важно учесть, что актуально, что старое
              </div>
              <textarea
                value={aiComment}
                onChange={(e) => setAiComment(e.target.value)}
                className="mt-3 min-h-[110px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-300"
                placeholder="Например: КП актуально, прайс обновлять раз в месяц..."
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={saveAll}
            className="h-11 w-full rounded-full bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}
