"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProjectFact, patchProjectFact, type ProjectFact } from "../../lib/projectFact";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function Page() {
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());

  useEffect(() => {
    setFact(loadProjectFact());
  }, []);

  const update = (patch: Partial<ProjectFact>) => {
    setFact((prev) => ({ ...prev, ...patch }));
    patchProjectFact(patch);
  };

  const updateEconomics = (patch: Partial<ProjectFact["economics"]>) => {
    const next = { ...fact.economics, ...patch };
    setFact((prev) => ({ ...prev, economics: next }));
    patchProjectFact({ economics: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-neutral-500">Онбординг • Шаг 3 из 4</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Продукт и экономика</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Эти данные нужны, чтобы отчёты и планы привязывались к деньгам.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <Field label="Что продаёте">
          <input
            value={fact.economics.product}
            onChange={(e) => updateEconomics({ product: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder="Например: маркетинг под ключ / мебель / услуги"
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Средний чек (₽)">
            <input
              value={fact.economics.averageCheck}
              onChange={(e) => updateEconomics({ averageCheck: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="Например: 50000"
              inputMode="numeric"
            />
          </Field>

          <Field label="Маржа (%)">
            <input
              value={fact.economics.marginPercent}
              onChange={(e) => updateEconomics({ marginPercent: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="Например: 30"
              inputMode="numeric"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link href="/app/onboarding/step-2" className="text-xs text-neutral-600 hover:underline">
            Назад
          </Link>

          <Link
            href="/app/onboarding/step-4"
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Дальше
          </Link>
        </div>
      </div>
    </div>
  );
}
