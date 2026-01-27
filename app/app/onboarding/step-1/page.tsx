"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadProjectFact,
  patchProjectFact,
  setLastStep,
  toggleInArray,
  type LegalForm,
  type WorkFormat,
} from "../../lib/projectFact";

type Economics = {
  product: string;
  averageCheck: string;
  marginPercent: string;
};

type FactShape = any; // чтобы не упереться в типы из либы, но при этом держать обязательные поля в форме

function normalizeFact(raw: FactShape) {
  const economics: Economics = {
    product: "",
    averageCheck: "",
    marginPercent: "",
    ...(raw?.economics ?? {}),
  };

  return {
    legalForm: raw?.legalForm ?? ("ИП" as LegalForm),
    niche: raw?.niche ?? "",
    geo: raw?.geo ?? "",
    workFormat: raw?.workFormat ?? ("Онлайн" as WorkFormat),
    services: Array.isArray(raw?.services) ? raw.services : [],
    revenueRange: raw?.revenueRange ?? "",
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
    economics,
  };
}

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StepDots({ active }: { active: 1 | 2 | 3 | 4 }) {
  const items = [
    { n: 1, label: "Бизнес" },
    { n: 2, label: "Каналы" },
    { n: 3, label: "Системы" },
    { n: 4, label: "Материалы" },
  ] as const;

  return (
    <div className="mt-1 flex items-center gap-4 text-sm text-neutral-500">
      {items.map((it, idx) => {
        const isActive = it.n === active;
        const isDone = it.n < active;
        return (
          <div key={it.n} className="flex items-center gap-2">
            <span
              className={[
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isDone
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-neutral-200 bg-white",
              ].join(" ")}
            >
              {it.n}
            </span>
            <span className={isActive ? "text-blue-700" : ""}>{it.label}</span>
            {idx !== items.length - 1 ? <span className="mx-1 text-neutral-300">—</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Page() {
  // ВАЖНО: не читаем localStorage в первом рендере (SSR), иначе hydration mismatch.
  const [fact, setFact] = useState(() => normalizeFact({}));
  const [serviceDraft, setServiceDraft] = useState("");
  const [addingService, setAddingService] = useState(false);

  useEffect(() => {
    setLastStep(1);
  }, []);

  useEffect(() => {
    // грузим фактуру после маунта (уже на клиенте)
    const loaded = loadProjectFact();
    setFact(normalizeFact(loaded));
  }, []);

  const canNext = useMemo(() => {
    return (fact.niche?.trim()?.length ?? 0) > 0 && (fact.geo?.trim()?.length ?? 0) > 0;
  }, [fact.niche, fact.geo]);

  const setLegalForm = (v: LegalForm) => {
    const next = { ...fact, legalForm: v };
    setFact(next);
    patchProjectFact({ legalForm: v });
  };

  const setWorkFormat = (v: WorkFormat) => {
    const next = { ...fact, workFormat: v };
    setFact(next);
    patchProjectFact({ workFormat: v });
  };

  const setField = (patch: any) => {
    const next = normalizeFact({ ...fact, ...patch });
    setFact(next);
    patchProjectFact(patch);
  };

  const addService = () => {
    const val = serviceDraft.trim();
    if (!val) return;

    if ((fact.services ?? []).includes(val)) {
      setServiceDraft("");
      setAddingService(false);
      return;
    }

    const nextServices = [...(fact.services ?? []), val];
    setFact({ ...fact, services: nextServices });
    patchProjectFact({ services: nextServices });

    setServiceDraft("");
    setAddingService(false);
  };

  const removeService = (name: string) => {
    const nextServices = (fact.services ?? []).filter((x: string) => x !== name);
    setFact({ ...fact, services: nextServices });
    patchProjectFact({ services: nextServices });
  };

  const revenueOptions = ["до 300 000 ₽", "300–700 000 ₽", "700 000–1,5 млн ₽", "1,5+ млн ₽"];

  const goalOptions = [
    "Больше заявок",
    "Увеличить выручку",
    "Повысить средний чек",
    "Разобраться с маркетингом",
    "Навести порядок в аналитике",
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      {/* LEFT */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-sm text-neutral-500">Шаг 1 из 4</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Расскажите о бизнесе</h1>

        <StepDots active={1} />

        {/* меньше вертикальных отступов */}
        <div className="mt-3 space-y-4">
          {/* legal form */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Юридическая форма</div>
            <div className="flex flex-wrap gap-2">
              <Pill active={fact.legalForm === "ИП"} onClick={() => setLegalForm("ИП")}>
                ИП
              </Pill>
              <Pill active={fact.legalForm === "ООО"} onClick={() => setLegalForm("ООО")}>
                ООО
              </Pill>
              <Pill active={fact.legalForm === "Самозанятый"} onClick={() => setLegalForm("Самозанятый")}>
                Самозанятый
              </Pill>
              <Pill active={fact.legalForm === "Другое"} onClick={() => setLegalForm("Другое")}>
                Другое
              </Pill>
            </div>
          </div>

          {/* niche */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Ниша / направление</div>
            <input
              value={fact.niche}
              onChange={(e) => setField({ niche: e.target.value })}
              className="w-full max-w-[680px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
              placeholder="Например: салон красоты, стоматология, онлайн-курсы"
            />
          </div>

          {/* geo */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Город / регион</div>
            <input
              value={fact.geo}
              onChange={(e) => setField({ geo: e.target.value })}
              className="w-full max-w-[680px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
              placeholder="Например: Казань"
            />
          </div>

          {/* work format */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Формат работы</div>
            <div className="flex flex-wrap gap-2">
              <Pill active={fact.workFormat === "Онлайн"} onClick={() => setWorkFormat("Онлайн")}>
                Онлайн
              </Pill>
              <Pill active={fact.workFormat === "Офлайн"} onClick={() => setWorkFormat("Офлайн")}>
                Офлайн
              </Pill>
              <Pill active={fact.workFormat === "Смешанный"} onClick={() => setWorkFormat("Смешанный")}>
                Смешанный
              </Pill>
            </div>
          </div>

          {/* avg check */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Средний чек (в ₽)</div>
            <input
              value={(fact.economics?.averageCheck ?? "") as string}
              onChange={(e) =>
                setField({
                  economics: {
                    ...(fact.economics as Economics),
                    averageCheck: e.target.value,
                  },
                })
              }
              className="w-full max-w-[260px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
              placeholder="Например: 7 000"
            />
          </div>

          {/* services tags */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Основные услуги / продукты</div>

            <div className="flex flex-wrap items-center gap-2">
              {(fact.services ?? []).map((s: string) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
                >
                  {s}
                  <button type="button" className="text-blue-700/70 hover:text-blue-900" onClick={() => removeService(s)}>
                    ×
                  </button>
                </span>
              ))}

              {!addingService ? (
                <button
                  type="button"
                  onClick={() => setAddingService(true)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  + Добавить
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={serviceDraft}
                    onChange={(e) => setServiceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addService();
                      if (e.key === "Escape") {
                        setAddingService(false);
                        setServiceDraft("");
                      }
                    }}
                    className="w-[220px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Например: Маникюр"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Ок
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* revenue range */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Примерная месячная выручка</div>
            <div className="flex flex-wrap gap-2">
              {revenueOptions.map((opt) => (
                <Pill key={opt} active={fact.revenueRange === opt} onClick={() => setField({ revenueRange: opt })}>
                  {opt}
                </Pill>
              ))}
            </div>
          </div>

          {/* goals */}
          <div>
            <div className="mb-2 text-sm text-neutral-700">Цели на ближайшие 3–6 месяцев</div>
            <div className="space-y-2">
              {goalOptions.map((g) => {
                const checked = (fact.goals ?? []).includes(g);
                return (
                  <label key={g} className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = toggleInArray(fact.goals ?? [], g);
                        setFact({ ...fact, goals: next });
                        patchProjectFact({ goals: next });
                      }}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    {g}
                  </label>
                );
              })}
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/app/dashboard"
              className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Назад
            </Link>

            <Link
              href={canNext ? "/app/onboarding/step-2" : "#"}
              onClick={(e) => {
                if (!canNext) e.preventDefault();
              }}
              className={[
                "rounded-full px-6 py-2.5 text-sm font-semibold",
                canNext ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-neutral-200 text-neutral-500",
              ].join(" ")}
            >
              Далее: каналы и системы
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT (короче, без огромных блоков) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 self-start">
        <h2 className="text-xl font-semibold tracking-tight">Зачем эти вопросы</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Мы соберём профиль бизнеса и подстроим рекомендации под вашу ситуацию.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-neutral-700">
          <li className="flex gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />
            Подберём каналы и формат продвижения
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />
            Сформируем цели и план на 30–90 дней
          </li>
        </ul>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Минимум для старта: ниша и регион. Остальное — по желанию.
        </div>
      </div>
    </div>
  );
}
