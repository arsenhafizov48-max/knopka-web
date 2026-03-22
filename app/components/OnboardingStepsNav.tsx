// app/components/OnboardingStepsNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadProjectFact } from "@/app/app/lib/projectFact";

type StepNum = 1 | 2 | 3 | 4;

export default function OnboardingStepsNav({
  currentStep,
  className = "",
}: {
  currentStep: StepNum;
  className?: string;
}) {
  const [lastStep, setLastStep] = useState<StepNum>(1);

  useEffect(() => {
    const read = () => {
      const f = loadProjectFact();
      const ls = (f?.lastStep ?? 1) as StepNum;
      setLastStep(ls === 1 || ls === 2 || ls === 3 || ls === 4 ? ls : 1);
    };

    read();
    window.addEventListener("knopka:projectFactUpdated", read);
    return () => window.removeEventListener("knopka:projectFactUpdated", read);
  }, []);

  const steps = useMemo(
    () =>
      [
        { n: 1 as StepNum, label: "Бизнес" },
        { n: 2 as StepNum, label: "Каналы" },
        { n: 3 as StepNum, label: "Системы" },
        { n: 4 as StepNum, label: "Материалы" },
      ] as const,
    []
  );

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {steps.map((s) => {
        const isActive = s.n === currentStep;
        const isDone = s.n < currentStep;

        // вперед нельзя. назад/текущий — можно
        const canGo = s.n <= lastStep;

        const pillClass = [
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
          isActive
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : isDone
            ? "border-neutral-200 bg-neutral-50 text-neutral-700"
            : "border-neutral-200 bg-white text-neutral-400",
          canGo ? "hover:bg-neutral-50" : "cursor-not-allowed",
        ].join(" ");

        const dotClass = [
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
          isActive
            ? "bg-blue-600 text-white"
            : isDone
            ? "bg-neutral-900 text-white"
            : "bg-neutral-200 text-neutral-700",
        ].join(" ");

        const pill = (
          <div className={pillClass}>
            <span className={dotClass}>{s.n}</span>
            <span className="whitespace-nowrap">{s.label}</span>
          </div>
        );

        if (!canGo) return <div key={s.n}>{pill}</div>;

        return (
          <Link key={s.n} href={`/app/onboarding/step-${s.n}`}>
            {pill}
          </Link>
        );
      })}
    </div>
  );
}
