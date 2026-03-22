"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TrendingUp, Users, CircleDollarSign, Target } from "lucide-react";

import { buildSnapshot, getPeriodRange } from "@/app/app/lib/data/compute";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function MiniKpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function fmtMoney(n: number) {
  return `${fmtInt(n)} ₽`;
}

export default function ReportsLiveKpis() {
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("knopka:dailyDataUpdated", on);
    return () => window.removeEventListener("knopka:dailyDataUpdated", on);
  }, [refresh]);

  const snap = useMemo(() => {
    void tick;
    const range = getPeriodRange({ preset: "month", baseDate: todayISO() });
    return buildSnapshot(range);
  }, [tick]);

  const s = snap.current.sum;
  const d = snap.current.derived;

  const cr =
    d.crClickToLead !== null
      ? `${(d.crClickToLead * 100).toFixed(1)}%`
      : "—";
  const romiHint =
    s.spend > 0 && s.revenue > 0
      ? `ориентир ${(s.revenue / s.spend).toFixed(2)} к расходу`
      : "нужны расход и выручка";

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <MiniKpi
        icon={<Users className="h-4 w-4 text-neutral-600" />}
        label="Заявки (каналы), месяц"
        value={fmtInt(s.leads)}
      />
      <MiniKpi
        icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
        label="Расход, месяц"
        value={fmtMoney(s.spend)}
      />
      <MiniKpi
        icon={<Target className="h-4 w-4 text-neutral-600" />}
        label="CR клик → заявка"
        value={cr}
      />
      <MiniKpi
        icon={<TrendingUp className="h-4 w-4 text-neutral-600" />}
        label="Окупаемость (грубо)"
        value={s.spend > 0 ? `${(s.revenue / s.spend).toFixed(2)}` : "—"}
        hint={romiHint}
      />
    </div>
  );
}
