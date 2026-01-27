import type { ReportInstance } from "../../lib/reports/types";

export default function ReportPreview({ report }: { report: ReportInstance }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold">Превью отчёта</div>
      <div className="mt-2 text-xs text-neutral-600">
        Пока MVP: показываем snapshot/meta. Дальше сделаем нормальную структуру блоков.
      </div>

      <pre className="mt-4 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800">
        {JSON.stringify(report, null, 2)}
      </pre>
    </div>
  );
}
