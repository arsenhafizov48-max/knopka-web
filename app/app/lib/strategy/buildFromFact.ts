import type { ProjectFact } from "@/app/app/lib/projectFact";
import { describeProductService, normalizeText } from "@/app/app/lib/projectFact";
import type { StrategyDocument, StrategySection } from "./types";

function parseNum(s: string): number | null {
  const t = normalizeText(s).replace(/\s/g, "").replace(",", ".");
  const n = Number(t.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function joinChannels(f: ProjectFact): string {
  const c = [...(f.channels.connected ?? []), ...(f.channels.planned ?? [])];
  const uniq = [...new Set(c.map((x) => normalizeText(x)).filter(Boolean))];
  return uniq.length ? uniq.join(", ") : "каналы уточняются";
}

export function buildStrategyDocument(f: ProjectFact): StrategyDocument {
  const now = new Date().toISOString();
  const name = normalizeText(f.projectName) || "ваш проект";
  const niche = normalizeText(f.niche);
  const geo = normalizeText(f.geo);
  const goal = normalizeText(f.goal);
  const product = describeProductService(f) || "не указано";
  const avgCheck = normalizeText(f.economics.averageCheck);
  const margin = normalizeText(f.economics.marginPercent);

  const curRev = parseNum(f.currentRevenue) ?? parseNum(f.pointA.revenue);
  const curCli = parseNum(f.currentClients) ?? parseNum(f.pointA.clients);
  const tgtRev = parseNum(f.targetRevenue) ?? parseNum(f.pointB.revenue);
  const tgtCli = parseNum(f.targetClients) ?? parseNum(f.pointB.clients);

  const sections: StrategySection[] = [];

  // 1. Цель и задача
  const goalParagraphs: string[] = [
    `Проект «${name}» в нише «${niche}», география: ${geo}.`,
    `Сформулированная цель: ${goal}.`,
    `Ключевое предложение: ${product}. Средний чек: ${avgCheck}.`,
  ];
  if (curRev !== null && curCli !== null) {
    goalParagraphs.push(
      `Точка А (оцифровка): выручка порядка ${fmtNum(curRev)} ₽, клиентов/сделок — ${fmtNum(curCli)} за выбранный период (как вы указали в фактуре).`
    );
  } else {
    goalParagraphs.push(
      "Точка А задана в качественном виде — для жёсткой математики воронки позже уточните период и единицы (месяц / квартал)."
    );
  }
  if (tgtRev !== null && tgtCli !== null) {
    goalParagraphs.push(
      `Точка Б: целевая выручка порядка ${fmtNum(tgtRev)} ₽, целевое число клиентов/сделок — ${fmtNum(tgtCli)}.`
    );
  }
  goalParagraphs.push(
    "Дальнейшие шаги в кабинете КНОПКИ: закрепить метрики в разделе «Данные», затем сравнивать план и факт в отчётах."
  );

  sections.push({
    id: "goal",
    title: "1. Цель и задача",
    paragraphs: goalParagraphs,
    bullets: [
      "Точка А и точка Б зафиксированы в фактуре — при изменении бизнеса обновите их, чтобы стратегия оставалась честной.",
      "Целевые показатели должны быть измеримыми: деньги, заявки, сделки, а не только «стало лучше».",
    ],
  });

  // 2. Анализ спроса и конкурентов
  sections.push({
    id: "market",
    title: "2. Анализ спроса и конкурентов",
    paragraphs: [
      `Рынок в нише «${niche}» в регионе «${geo}» без подключённых внешних данных (Вордстат, выдача, рекламные аукционы) мы описываем только на уровне вашей фактуры.`,
      "Сильные игроки и занятые каналы в автоматическом режиме не подтягиваются — это запланировано в расширенной версии сервиса.",
      "Что можно сделать уже сейчас: вручную зафиксировать 3–5 конкурентов и их витрины (сайт, Авито, соцсети) в заметках к проекту и перенести выводы в раздел «Планы».",
    ],
    bullets: [
      "Без данных по спросу не стоит резать бюджеты «на глаз» — опирайтесь на тесты гипотез с лимитом расхода.",
      "Когда появятся интеграции, этот блок дополнится цифрами по запросам и конкуренции.",
    ],
  });

  // 3. Что есть сейчас
  const integConnected = f.integrations.filter((i) => i.status !== "not_connected");
  const integText =
    integConnected.length > 0
      ? integConnected.map((i) => i.title).join(", ")
      : "подключения из фактуры пока не отмечены как активные";

  sections.push({
    id: "current",
    title: "3. Что есть сейчас",
    paragraphs: [
      `Каналы (из онбординга): ${joinChannels(f)}.`,
      `Интеграции и системы: ${integText}.`,
      normalizeText(f.goalDetails.marketingComment)
        ? `Комментарий по маркетингу: ${normalizeText(f.goalDetails.marketingComment)}`
        : "Отдельные комментарии по маркетингу в фактуре не заполнены — при необходимости добавьте их на экране фактуры.",
      normalizeText(f.goalDetails.analyticsComment)
        ? `Аналитика и учёт: ${normalizeText(f.goalDetails.analyticsComment)}`
        : "",
    ].filter(Boolean),
    bullets: f.channelBudgets
      .filter((r) => normalizeText(r.channel))
      .slice(0, 8)
      .map((r) => `${normalizeText(r.channel)} — заложено ${fmtNum(r.budget)} ₽/мес (по вашим данным).`),
  });

  // 4. Декомпозиция точки Б
  const decParagraphs: string[] = [];
  if (curCli !== null && tgtCli !== null && curCli > 0) {
    const k = tgtCli / curCli;
    decParagraphs.push(
      `Чтобы выйти на целевое число клиентов/сделок, ориентировочно нужно кратность около ${k.toFixed(2)}× к текущему потоку (при прочих равных).`
    );
  } else {
    decParagraphs.push(
      "Для численной декомпозиции воронки нужны согласованные цифры по клиентам/сделкам в точках А и Б — уточните их в фактуре."
    );
  }
  if (curRev !== null && tgtRev !== null && curRev > 0) {
    decParagraphs.push(
      `По выручке целевой коэффициент роста относительно введённой точки А: около ${(tgtRev / curRev).toFixed(2)}×.`
    );
  }
  if (!margin) {
    decParagraphs.push(
      "Маржа в фактуре не указана — расчёт допустимой стоимости лида и ROMI в этом документе не форсируем; заполните маржу для следующей итерации стратегии."
    );
  } else {
    decParagraphs.push(`Указанная маржа: ${margin} — используйте её при оценке окупаемости каналов.`);
  }
  decParagraphs.push(
    "Сценарии «базовый / реалистичный / усиленный» в MVP задаются через ваши целевые показатели и бюджеты по каналам; уточняйте их по мере появления фактических данных."
  );

  sections.push({
    id: "decomposition",
    title: "4. Декомпозиция точки Б",
    paragraphs: decParagraphs,
    bullets: [
      "Свяжите цель с воронкой: трафик → заявки → квалификация → сделка.",
      "Если средний чек растёт, потребность в количестве сделок для той же выручки снижается — пересчитайте цели.",
    ],
  });

  // 5. Каналы и приоритеты
  const withBudget = f.channelBudgets
    .filter((r) => normalizeText(r.channel))
    .sort((a, b) => b.budget - a.budget);
  const ordered = withBudget.length
    ? withBudget.map((r) => normalizeText(r.channel))
    : [...new Set([...(f.channels.connected ?? []), ...(f.channels.planned ?? [])])].filter(Boolean);

  const channelBullets =
    ordered.length > 0
      ? ordered.map((ch, i) => {
          const row = f.channelBudgets.find((r) => normalizeText(r.channel) === ch);
          const b = row && row.budget > 0 ? ` (бюджет ${fmtNum(row.budget)} ₽/мес)` : "";
          return `${i + 1}. ${ch}${b} — приоритет по важности для вашей текущей фактуры.`;
        })
      : ["Уточните каналы во втором шаге онбординга или в фактуре."];

  sections.push({
    id: "channels",
    title: "5. Каналы и приоритеты",
    paragraphs: [
      "Быстрый эффект чаще дают каналы с уже тёплой аудиторией и понятным спросом (контекст по высокоинтентным запросам, маркетплейсы, рекомендации).",
      "В долгую работают контент, SEO, бренд и работа с повторными продажами — их разумно подключать, когда поток заявок стабилен.",
      "Не запускайте всё сразу: 1–2 опорных канала + измеримость (цели, метки, CRM).",
    ],
    bullets: channelBullets,
  });

  // 6. Бюджеты и специалисты
  const specBullets = f.specialistCosts
    .filter((r) => normalizeText(r.role))
    .map(
      (r) =>
        `${normalizeText(r.role)}: ${r.cost > 0 ? `ориентир ${fmtNum(r.cost)} ₽/мес` : "стоимость не задана — оцените рынок или запросите КП у специалистов"}`
    );

  sections.push({
    id: "budget",
    title: "6. Бюджеты и специалисты",
    paragraphs: [
      "Варианты исполнения: силами компании, фрилансер, агентство. Выбор зависит от скорости, риска и доступной экспертизы.",
      "Закрепите верхнюю границу тестового бюджета на канал и срок проверки гипотезы (например, 2–3 недели при достаточном объёме показов).",
    ],
    bullets:
      specBullets.length > 0
        ? specBullets
        : [
            "Добавьте в фактуру роли и стоимость специалистов — стратегия станет конкретнее.",
          ],
  });

  // 7. Что делать дальше
  sections.push({
    id: "next",
    title: "7. Что делать дальше",
    paragraphs: [
      "Ниже — порядок действий, согласованный с логикой КНОПКИ: сначала ясность и учёт, потом масштабирование.",
    ],
    bullets: [
      "Проверьте фактуру и при необходимости обновите цифры в разделе «Фактура бизнеса».",
      "Внесите ежедневные или еженедельные показатели в «Данные», чтобы отчёты отражали реальность.",
      "Запустите или донастройте первый приоритетный канал из списка выше с лимитом бюджета.",
      "Проверьте сайт и посадочные: скорость, мобильная версия, понятное УТП и форма заявки.",
      "Согласуйте с отделом продаж скрипт обработки заявок и фиксацию стадий в CRM.",
      "Назначьте дату пересмотра стратегии (например, через 4 недели) по результатам отчёта.",
    ],
  });

  return {
    version: 1,
    generatedAt: now,
    factSnapshotUpdatedAt: f.updatedAt,
    sections,
  };
}
