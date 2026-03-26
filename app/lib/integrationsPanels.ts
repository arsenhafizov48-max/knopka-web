import type { SupabaseClient } from "@supabase/supabase-js";

export type IntegrationTone = "ok" | "warn" | "bad" | "info";

export type HistoryItem = {
  /** id строки в integration_activity — для ключей React */
  id: string;
  tone: IntegrationTone;
  title: string;
  text: string;
};

export type UsedRow = {
  kpi: string;
  sources: string;
  status: IntegrationTone;
  statusText: string;
};

export type IntegrationPanelsPayload = {
  knopkaSees: string[];
  priorities: string[];
  history: HistoryItem[];
  usedInReports: UsedRow[];
};

function normalizeTone(raw: string | null | undefined): IntegrationTone {
  if (raw === "ok" || raw === "warn" || raw === "bad" || raw === "info") return raw;
  return "info";
}

/** Заголовок строки истории: время по МСК + источник. */
export function formatHistoryTitleMsk(iso: string, source: string): string {
  const when = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${when} МСК • ${source}`;
}

export async function buildIntegrationPanels(
  admin: SupabaseClient,
  userId: string
): Promise<IntegrationPanelsPayload> {
  const { data: activities } = await admin
    .from("integration_activity")
    .select("id, source, message, tone, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: dirRows } = await admin.from("yandex_direct_oauth").select("id").eq("user_id", userId);
  const { data: ymOauthRows } = await admin
    .from("yandex_metrika_oauth")
    .select("id")
    .eq("user_id", userId);

  const { data: ymCounters } = await admin
    .from("yandex_metrika_counters")
    .select("counter_id, sync_status, connection_id")
    .eq("user_id", userId);

  const directCount = dirRows?.length ?? 0;
  const metrikaConnCount = ymOauthRows?.length ?? 0;
  const counterCount = ymCounters?.length ?? 0;
  const countersOk =
    counterCount > 0 &&
    (ymCounters ?? []).every((c) => (c as { sync_status?: string | null }).sync_status === "ok");

  const knopkaSees: string[] = [];
  if (metrikaConnCount > 0 && counterCount > 0) {
    knopkaSees.push(
      `По трафику сайта: ${metrikaConnCount} подключени${metrikaConnCount === 1 ? "е" : "я"} Метрики, ${counterCount} счётчик(ов); данные для отчётов подтягиваются.`
    );
  } else if (metrikaConnCount > 0) {
    knopkaSees.push(
      "Метрика OAuth подключена, но счётчики не добавлены — визиты и конверсии по сайту в отчётах не появятся."
    );
  } else {
    knopkaSees.push("Яндекс Метрика не подключена — трафик по сайту в отчётах не будет.");
  }

  if (directCount > 0) {
    knopkaSees.push(
      `Реклама: ${directCount} аккаунт(ов) Яндекс Директа — расходы и структура кампаний доступны после синхронизации.`
    );
  } else {
    knopkaSees.push("Яндекс Директ не подключён — расходы на Директ в отчётах не агрегируются автоматически.");
  }

  knopkaSees.push(
    "Google Analytics / GA4 и Search Console в кабинете не подключены — органика из экосистемы Google в модели не учитывается."
  );
  knopkaSees.push(
    "Каналы вроде Авито и офлайн-выручка: фактические данные зависят от того, что вы завели в КНОПКЕ (CRM, ручной импорт, ссылки на площадки)."
  );

  const priorities: string[] = [];
  if (metrikaConnCount === 0) {
    priorities.push("Подключите Яндекс Метрику (OAuth) и добавьте счётчик сайта — иначе трафик «вслепую».");
  } else if (counterCount === 0) {
    priorities.push("Добавьте номер счётчика Метрики в «Системы и данные» для выгрузки визитов.");
  }
  if (directCount === 0) {
    priorities.push("Подключите Яндекс Директ — чтобы тянуть расходы и структуру рекламных кампаний.");
  }
  priorities.push("Подключите Google Search Console — чтобы видеть органику поиска (часть воронки).");
  priorities.push("Настройте связку лидов Авито с CRM, если заявки приходят с Авито.");
  priorities.push("Автоматизируйте офлайн-выручку (касса / 1С), если маржа считается не только из CRM.");

  const trafficStatus: IntegrationTone =
    metrikaConnCount > 0 && counterCount > 0 ? (countersOk ? "ok" : "warn") : "warn";
  const trafficText =
    metrikaConnCount > 0 && counterCount > 0 ? (countersOk ? "OK" : "частично") : "частично";

  const adStatus: IntegrationTone = directCount > 0 ? "warn" : "bad";
  const adText = directCount > 0 ? "частично" : "нет";

  const usedInReports: UsedRow[] = [
    {
      kpi: "Трафик сайта",
      sources:
        metrikaConnCount > 0 && counterCount > 0
          ? `Яндекс Метрика (${counterCount} сч.) · без GA4/GSC`
          : metrikaConnCount > 0
            ? "Метрика без счётчиков · без GA4/GSC"
            : "Нет Метрики · без GA4/GSC",
      status: trafficStatus,
      statusText: trafficText,
    },
    {
      kpi: "Заявки",
      sources: "Формы сайта, Авито, YClients — по настройкам в КНОПКЕ",
      status: "warn",
      statusText: "частично",
    },
    {
      kpi: "Сделки и выручка",
      sources: "CRM и офлайн-импорт (по факту подключения)",
      status: "warn",
      statusText: "частично",
    },
    {
      kpi: "Расходы на рекламу",
      sources:
        directCount > 0
          ? `Яндекс Директ (${directCount} акк.) · прочие каналы вручную`
          : "Нет Директа в OAuth",
      status: adStatus,
      statusText: adText,
    },
    {
      kpi: "Отказы / конверсии по устройствам",
      sources: counterCount > 0 ? "Яндекс Метрика" : "Нет счётчиков Метрики",
      status: counterCount > 0 ? "ok" : "bad",
      statusText: counterCount > 0 ? "OK" : "нет",
    },
  ];

  const history: HistoryItem[] = (activities ?? []).map((a) => {
    const row = a as {
      id: string;
      source: string;
      message: string;
      tone?: string;
      created_at: string;
    };
    return {
      id: row.id,
      tone: normalizeTone(row.tone),
      title: formatHistoryTitleMsk(row.created_at, row.source),
      text: row.message,
    };
  });

  return {
    knopkaSees,
    priorities,
    history,
    usedInReports,
  };
}
