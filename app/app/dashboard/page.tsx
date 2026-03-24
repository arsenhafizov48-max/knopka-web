// app/app/dashboard/page.tsx
import StrategyCtaCard from "./StrategyCtaCard";
import DashboardLiveBlocks from "./DashboardLiveBlocks";
import WordstatHealthCard from "./WordstatHealthCard";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Цифры из раздела «Данные» и фактура проекта за последние 30 дней. Подсказки — что заполнить и куда
            перейти дальше.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Период:</span>
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700">
            последние 30 дней
          </span>
        </div>
      </div>

      <StrategyCtaCard />

      <WordstatHealthCard />

      <DashboardLiveBlocks />
    </div>
  );
}
