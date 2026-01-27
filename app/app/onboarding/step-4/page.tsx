"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProjectFact, setOnboardingDone, type ProjectFact } from "../../lib/projectFact";
import { useRouter } from "next/navigation";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-900">{value || "—"}</div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());

  useEffect(() => {
    setFact(loadProjectFact());
  }, []);

  const finish = () => {
    setOnboardingDone(true);
    router.push("/app/dashboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-neutral-500">Онбординг • Шаг 4 из 4</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Итог</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Проверь данные. После этого кабинет откроется полностью.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Профиль проекта">
          <div className="space-y-3">
            <Row label="Название" value={fact.projectName} />
            <Row label="Ниша" value={fact.niche} />
            <Row label="География" value={fact.geo} />
            <Row label="Цель" value={fact.goal} />
          </div>

          <div className="mt-4">
            <Link href="/app/onborarding/step-1" className="text-xs text-blue-700 hover:underline">
              Изменить шаг 1 →
            </Link>
          </div>
        </Block>

        <Block title="Каналы">
          <div className="space-y-3">
            <Row label="Подключены" value={fact.channels.connected.length ? fact.channels.connected.join(", ") : ""} />
            <Row label="Планируются" value={fact.channels.planned.length ? fact.channels.planned.join(", ") : ""} />
          </div>

          <div className="mt-4">
            <Link href="/app/onborarding/step-2" className="text-xs text-blue-700 hover:underline">
              Изменить шаг 2 →
            </Link>
          </div>
        </Block>

        <Block title="Продукт и экономика">
          <div className="space-y-3">
            <Row label="Продукт" value={fact.economics.product} />
            <Row label="Средний чек" value={fact.economics.averageCheck ? `${fact.economics.averageCheck} ₽` : ""} />
            <Row label="Маржа" value={fact.economics.marginPercent ? `${fact.economics.marginPercent}%` : ""} />
          </div>

          <div className="mt-4">
            <Link href="/app/onborarding/step-3" className="text-xs text-blue-700 hover:underline">
              Изменить шаг 3 →
            </Link>
          </div>
        </Block>

        <Block title="Готово">
          <div className="text-sm text-neutral-700">
            После завершения ты сможешь открывать разделы и собирать отчёты по проекту.
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link href="/app/onborarding/step-3" className="text-xs text-neutral-600 hover:underline">
              Назад
            </Link>

            <button
              onClick={finish}
              className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              Завершить и перейти в кабинет
            </button>
          </div>
        </Block>
      </div>
    </div>
  );
}
