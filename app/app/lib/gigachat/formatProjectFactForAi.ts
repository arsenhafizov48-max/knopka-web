"use client";

import type { ProjectFact } from "@/app/app/lib/projectFact";

/** Текстовый снимок фактуры для системного промпта GigaChat (без выдумывания полей). */
export function formatProjectFactForAi(fact: ProjectFact | null): string {
  if (!fact) {
    return "";
  }

  const lines: string[] = [];

  lines.push("=== ДАННЫЕ ИЗ ЛИЧНОГО КАБИНЕТА КНОПКА (фактура) ===");
  lines.push(`Обновлено: ${fact.updatedAt}`);
  lines.push(`Онбординг завершён: ${fact.onboardingDone ? "да" : "нет"}, последний шаг: ${fact.lastStep}`);
  lines.push("");

  lines.push("## Проект");
  lines.push(`Название: ${fact.projectName || "—"}`);
  lines.push(`Ниша: ${fact.niche || "—"}`);
  lines.push(`География: ${fact.geo || "—"}`);
  lines.push(`Форма: ${fact.legalForm}, формат работы: ${fact.workFormat}`);
  lines.push(`Услуги/продукты: ${fact.services?.length ? fact.services.join(", ") : "—"}`);
  lines.push(`Диапазон выручки (как указал пользователь): ${fact.revenueRange || "—"}`);
  lines.push(`Цели (теги): ${fact.goals?.length ? fact.goals.join(", ") : "—"}`);
  lines.push(`Главная цель (текст): ${fact.goal || "—"}`);
  lines.push("");

  lines.push("## Точка А (сейчас)");
  lines.push(`Выручка: ${fact.pointA?.revenue || fact.currentRevenue || "—"}`);
  lines.push(`Клиенты: ${fact.pointA?.clients || fact.currentClients || "—"}`);
  if (fact.pointA?.averageCheck) lines.push(`Средний чек: ${fact.pointA.averageCheck}`);
  lines.push("");

  lines.push("## Точка Б (куда идём)");
  lines.push(`Выручка: ${fact.pointB?.revenue || fact.targetRevenue || "—"}`);
  lines.push(`Клиенты: ${fact.pointB?.clients || fact.targetClients || "—"}`);
  if (fact.pointB?.averageCheck) lines.push(`Средний чек (цель): ${fact.pointB.averageCheck}`);
  lines.push("");

  lines.push("## Детали целей");
  const gd = fact.goalDetails;
  if (gd) {
    lines.push(`Лидов сейчас / хочу: ${gd.moreLeadsNow || "—"} / ${gd.moreLeadsWant || "—"}`);
    lines.push(`Средний чек (хочу): ${gd.avgCheckWant || "—"}`);
    lines.push(`Маркетинг: ${gd.marketingComment || "—"}`);
    lines.push(`Аналитика: ${gd.analyticsComment || "—"}`);
  }
  lines.push("");

  lines.push("## Экономика");
  lines.push(`Продукт/услуга (коротко): ${fact.economics?.product || "—"}`);
  lines.push(`Средний чек: ${fact.economics?.averageCheck || "—"}`);
  lines.push(`Маржа %: ${fact.economics?.marginPercent || "—"}`);
  lines.push("");

  lines.push("## Каналы");
  lines.push(`Подключены: ${fact.channels?.connected?.length ? fact.channels.connected.join(", ") : "—"}`);
  lines.push(`Планируются: ${fact.channels?.planned?.length ? fact.channels.planned.join(", ") : "—"}`);
  if (fact.channelBudgets?.length) {
    lines.push("Бюджеты по каналам:");
    for (const row of fact.channelBudgets) {
      if (row.channel) lines.push(`- ${row.channel}: ${row.budget}`);
    }
  }
  if (fact.specialistCosts?.length) {
    lines.push("Специалисты (стоимость):");
    for (const row of fact.specialistCosts) {
      if (row.role) lines.push(`- ${row.role}: ${row.cost}`);
    }
  }
  lines.push("");

  lines.push("## Площадки и ссылки");
  const pl = fact.platformLinks;
  if (pl) {
    const entries: [string, string][] = [
      ["Сайт", pl.site],
      ["Telegram", pl.telegram],
      ["Instagram", pl.instagram],
      ["VK", pl.vk],
      ["Яндекс Карты / Бизнес", pl.yandexMaps || pl.yandexBusiness || ""],
      ["Авито", pl.avito],
      ["Маркетплейсы", pl.marketplaces],
      ["Другое", pl.other],
    ];
    for (const [k, v] of entries) {
      if (v?.trim()) lines.push(`${k}: ${v.trim()}`);
    }
  }
  lines.push("");

  lines.push("## Системы (интеграции)");
  if (fact.integrations?.length) {
    for (const i of fact.integrations) {
      lines.push(`- ${i.title} [${i.group}]: ${i.status}`);
    }
  } else {
    lines.push("—");
  }
  lines.push("");

  lines.push("## Материалы (имена файлов в кабинете, не содержимое)");
  const m = fact.materials;
  if (m) {
    lines.push(`Коммерческие: ${m.commercialFiles?.length ? m.commercialFiles.join(", ") : "—"}`);
    lines.push(`Прайсы: ${m.priceFiles?.length ? m.priceFiles.join(", ") : "—"}`);
    lines.push(`Бренд: ${m.brandFiles?.length ? m.brandFiles.join(", ") : "—"}`);
    if (m.aiComment?.trim()) lines.push(`Комментарий к материалам: ${m.aiComment.trim()}`);
  }
  lines.push("");
  lines.push("=== КОНЕЦ СНИМКА ФАКТУРЫ ===");

  return lines.join("\n").slice(0, 28_000);
}
