"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadProjectFact, patchProjectFact, toggleInArray, type ProjectFact } from "../../lib/projectFact";

const CHANNELS = [
  "Яндекс.Директ",
  "Telegram Ads",
  "Посевы в Telegram",
  "SEO",
  "SMM",
  "Авито",
  "Маркетплейсы",
  "Email-рассылки",
  "CRM",
  "Коллтрекинг",
];

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
    >
      <span className="text-neutral-900">{label}</span>
      <span className={`h-5 w-5 rounded-md border ${checked ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"}`} />
    </button>
  );
}

export default function Page() {
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());

  useEffect(() => {
    setFact(loadProjectFact());
  }, []);

  const connected = useMemo(() => fact.channels.connected ?? [], [fact.channels.connected]);
  const planned = useMemo(() => fact.channels.planned ?? [], [fact.channels.planned]);

  const update = (nextConnected: string[], nextPlanned: string[]) => {
    setFact((prev) => ({
      ...prev,
      channels: { connected: nextConnected, planned: nextPlanned },
    }));
    patchProjectFact({
      channels: { connected: nextConnected, planned: nextPlanned },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-neutral-500">Онбординг • Шаг 2 из 4</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Каналы</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Отметь, что уже используешь и что хочешь подключить дальше.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Подключены" subtitle="То, что уже работает или тестируется сейчас">
          <div className="space-y-2">
            {CHANNELS.map((c) => (
              <CheckItem
                key={c}
                label={c}
                checked={connected.includes(c)}
                onChange={() => update(toggleInArray(connected, c), planned.filter((x) => x !== c))}
              />
            ))}
          </div>
        </Card>

        <Card title="Планируются" subtitle="То, что хочешь подключить в ближайшие 2–8 недель">
          <div className="space-y-2">
            {CHANNELS.map((c) => (
              <CheckItem
                key={c}
                label={c}
                checked={planned.includes(c)}
                onChange={() => update(connected.filter((x) => x !== c), toggleInArray(planned, c))}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href="/app/onborarding/step-1" className="text-xs text-neutral-600 hover:underline">
          Назад
        </Link>

        <Link
          href="/app/onborarding/step-3"
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          Дальше
        </Link>
      </div>
    </div>
  );
}
