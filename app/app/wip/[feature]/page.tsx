import Link from "next/link";
import { FEATURES, type FeatureKey } from "@/app/lib/features";

const FALLBACK = {
  title: "Раздел в разработке",
  text: "Этот раздел появится после следующего обновления.",
};

export default async function WipFeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  const key = feature as FeatureKey;
  const meta = FEATURES[key];

  const title = meta?.title ?? FALLBACK.title;
  const text = meta?.wipHint ?? FALLBACK.text;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm text-slate-500">Статус</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-700">{text}</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/app/reports"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Вернуться в отчёты →
          </Link>

          <Link
            href="/app/catalog"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Открыть каталог →
          </Link>

          <Link
            href="/app/settings"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Настройки →
          </Link>
        </div>
      </div>
    </div>
  );
}
