import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { IntegrationsOverviewBlocks } from "@/app/app/components/IntegrationsOverviewBlocks";
import { withBasePath } from "@/app/lib/publicBasePath";

export default function IntegrationDataPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-6">
      <Link
        href={withBasePath("/app/systems")}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" /> Системы и данные
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Данные интеграций</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-600">
        Сводка по Метрике, Директу и Авито. Тот же текст уходит в GigaChat при анализе стратегии — без выдуманных
        цифр.
      </p>

      <div className="mt-6">
        <IntegrationsOverviewBlocks showAiBlock />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href={withBasePath("/app/metrika-data")}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
        >
          Яндекс Метрика →
        </Link>
        <Link
          href={withBasePath("/app/yandex-direct-data")}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
        >
          Яндекс Директ →
        </Link>
        <Link
          href={withBasePath("/app/avito-data")}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
        >
          Авито →
        </Link>
      </div>
    </div>
  );
}
