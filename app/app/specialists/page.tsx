import { Users } from "lucide-react";

import { ProductEmptyState } from "@/app/app/components/ProductEmptyState";

export default function SpecialistsPage() {
  return (
    <div className="py-8">
      <ProductEmptyState
        icon={<Users className="h-10 w-10 text-blue-400" />}
        title="Биржа специалистов"
        description="Здесь будет подбор исполнителей и агентств под вашу стратегию: фильтры, рекомендации ИИ и карточки специалистов. Раздел в разработке — скоро подключим."
        actionLabel="Вернуться на дашборд"
        actionHref="/app/dashboard"
      />
    </div>
  );
}
