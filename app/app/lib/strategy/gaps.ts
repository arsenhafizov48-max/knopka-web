import type { ProjectFact } from "@/app/app/lib/projectFact";
import { describeProductService, normalizeText } from "@/app/app/lib/projectFact";
import type { StrategyGapItem } from "./types";

/** Что нужно заполнить, чтобы честно собрать стратегию без выдуманных цифр */
export function getStrategyGaps(f: ProjectFact): {
  ok: boolean;
  items: StrategyGapItem[];
} {
  const items: StrategyGapItem[] = [];

  if (!normalizeText(f.projectName)) {
    items.push({ label: "Название компании или проекта", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.niche)) {
    items.push({ label: "Ниша и тип бизнеса", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.geo)) {
    items.push({ label: "География (город / регион)", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.goal)) {
    items.push({ label: "Главная цель на горизонт 3–6 месяцев", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.currentRevenue)) {
    items.push({ label: "Оборот или выручка сейчас (точка А)", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.currentClients)) {
    items.push({
      label: "Клиенты или сделки сейчас (точка А)",
      href: "/app/onboarding/step-1",
    });
  }
  if (!normalizeText(f.targetRevenue)) {
    items.push({ label: "Целевой оборот (точка Б)", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(f.targetClients)) {
    items.push({
      label: "Целевое число клиентов или сделок (точка Б)",
      href: "/app/onboarding/step-1",
    });
  }
  if (!normalizeText(f.economics.averageCheck)) {
    items.push({ label: "Средний чек", href: "/app/onboarding/step-1" });
  }
  if (!normalizeText(describeProductService(f))) {
    items.push({
      label: "Ключевой продукт или услуга (блок «Услуги / продукты» на шаге 1)",
      href: "/app/onboarding/step-1",
    });
  }

  const hasChannelSignal =
    (f.channels.connected?.length ?? 0) + (f.channels.planned?.length ?? 0) > 0 ||
    f.channelBudgets.some((r) => normalizeText(r.channel));

  if (!hasChannelSignal) {
    items.push({
      label: "Каналы: что уже используете или планируете запустить",
      href: "/app/onboarding/step-2",
    });
  }

  return { ok: items.length === 0, items };
}
