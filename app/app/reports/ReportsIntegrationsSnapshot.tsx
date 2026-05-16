"use client";

import { IntegrationsOverviewBlocks } from "@/app/app/components/IntegrationsOverviewBlocks";

export default function ReportsIntegrationsSnapshot() {
  return (
    <IntegrationsOverviewBlocks
      title="Данные из подключений"
      description="Метрика, Директ и Авито — для сверки с ручным вводом в «Данные» и для анализа GigaChat."
      showAiBlock
    />
  );
}
