import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { getDaily, listDaily } from "@/app/app/lib/data/storage";
import { loadStrategy } from "@/app/app/lib/strategy/storage";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";

export type CabinetNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  severity: "info" | "warning";
};

function yesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё-]/gi, "")
    .slice(0, 48);
}

/**
 * Уведомления из реальных данных кабинета (без вызова GigaChat — бесплатно и предсказуемо).
 * Позже сюда можно добавить «обогащение текстом от ИИ» по кнопке.
 */
export function buildCabinetNotifications(): CabinetNotification[] {
  const items: CabinetNotification[] = [];
  const fact = loadProjectFact();

  if (!fact.onboardingDone) {
    items.push({
      id: "onboarding-incomplete",
      title: "Онбординг",
      body: "Завершите знакомство с кабинетом — так стратегия и подсказки будут точнее.",
      href: "/app/onboarding/step-1",
      severity: "warning",
    });
  }

  const gaps = getStrategyGaps(fact);
  if (!gaps.ok) {
    const top = gaps.items.slice(0, 5);
    for (const g of top) {
      items.push({
        id: `fact-gap-${slug(g.label)}`,
        title: "Фактура",
        body: `Заполни: ${g.label}.`,
        href: g.href,
        severity: "warning",
      });
    }
    if (gaps.items.length > top.length) {
      items.push({
        id: "fact-gap-more",
        title: "Фактура",
        body: `Ещё ${gaps.items.length - top.length} полей — открой фактуру и дозаполни.`,
        href: "/app/fact",
        severity: "info",
      });
    }
  }

  if (gaps.ok && !loadStrategy()) {
    items.push({
      id: "strategy-not-generated",
      title: "Стратегия",
      body: "Фактура достаточно заполнена — можно собрать черновик стратегии маркетинга.",
      href: "/app/strategy",
      severity: "info",
    });
  }

  const recent = listDaily().length;
  if (recent === 0 && fact.onboardingDone) {
    items.push({
      id: "daily-never",
      title: "Ежедневные данные",
      body: "Пока ни одного дня не внесено. Начни с сегодня или вчера на странице «Данные».",
      href: "/app/data",
      severity: "info",
    });
  } else {
    const y = yesterdayYmd();
    if (!getDaily(y)) {
      items.push({
        id: `daily-missing-${y}`,
        title: "Данные за вчера",
        body: `Нет записи за ${y}. Заполни показатели за день — дашборд и отчёты будут актуальнее.`,
        href: "/app/data",
        severity: "warning",
      });
    }
  }

  return items;
}
