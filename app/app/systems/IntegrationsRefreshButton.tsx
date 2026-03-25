"use client";

export function IntegrationsRefreshButton() {
  return (
    <button
      type="button"
      className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
      onClick={() => window.dispatchEvent(new Event("knopka:integrationsRefresh"))}
    >
      Обновить статусы интеграций
    </button>
  );
}
