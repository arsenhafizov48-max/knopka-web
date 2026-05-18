import { Suspense } from "react";

import { SystemsPageClient } from "@/app/app/systems/SystemsPageClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Загрузка…</div>}>
      <SystemsPageClient />
    </Suspense>
  );
}
