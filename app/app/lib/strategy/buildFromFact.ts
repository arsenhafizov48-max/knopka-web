import type { ProjectFact } from "@/app/app/lib/projectFact";
import { describeProductService, normalizeText } from "@/app/app/lib/projectFact";
import type { StrategyDocument, StrategySection } from "./types";

export type BuildStrategyOptions = {
  /** Текст из GET /api/integrations/summary (blockForAi) — сводка Директ/Метрика. */
  integrationsBlock?: string;
};

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

function buildPointASection(fact: ProjectFact, integrationsBlock?: string): StrategySection {
  const paragraphs: string[] = [];
  if (integrationsBlock?.trim()) {
    paragraphs.push(
      "Ниже — сводка по подключённым системам (сервер КНОПКИ). Используйте её как фактическую «точку А» по маркетингу и рекламным аккаунтам."
    );
    for (const line of integrationsBlock.split("\n").map((l) => l.trim()).filter(Boolean)) {
      paragraphs.push(line);
    }
  } else {
    paragraphs.push(
      "Здесь будет аналитика по уже подключённым каналам: Яндекс Директ, Метрика и др. Подключите системы в разделе «Системы и данные», дождитесь синхронизации и нажмите «Пересобрать стратегию» — блок заполнится выводами по кампаниям, визитам и структуре аккаунтов."
    );
  }
  const active = fact.integrations?.filter((i) => i.status !== "not_connected") ?? [];
  if (active.length) {
    paragraphs.push(
      "Статусы из фактуры: " + active.map((i) => `${i.title} (${i.status})`).join("; ") + "."
    );
  }

  return {
    id: "point_a",
    title: "2. Точка А — анализ маркетинга",
    paragraphs,
    bullets: [
      "Точка А — это «что есть по данным сейчас», без желаемого будущего.",
      "Если Директ/Метрика не подключены, ориентируйтесь на фактуру и ручные отчёты до появления интеграций.",
    ],
  };
}

function buildDemandPlaceholder(): StrategySection {
  return {
    id: "demand",
    title: "3. Анализ спроса",
    paragraphs: [
      "Этот раздел заполняется после запуска «Анализ спроса (Яндекс.Вордстат)» на вкладке «Спрос»: ИИ подбирает запросы и выдаёт таблицы спроса по вашей нише и региону.",
    ],
    bullets: [
      "Без Вордстата не опирайтесь на «догадки по частотности» — либо запустите анализ, либо помечайте гипотезы как непроверенные.",
    ],
  };
}

function buildCompetitorsPlaceholder(): StrategySection {
  return {
    id: "competitors",
    title: "4. Анализ конкурентов",
    paragraphs: [
      "Этот раздел заполняется после «Запустить анализ конкурентов» на вкладке «Конкуренты»: таблицы по сайтам, Яндекс.Картам и 2ГИС попадут сюда, в документ стратегии.",
    ],
    bullets: [
      "В таблицах должны быть ссылки на сайты и карточки — проверяйте актуальность цен и офферов вручную.",
      "Карты: ориентир радиуса 3 км от точки бизнеса — уточняйте под ваш адрес в фактуре.",
    ],
  };
}

export function buildStrategyDocument(fact: ProjectFact, opts?: BuildStrategyOptions): StrategyDocument {
  const now = new Date().toISOString();
  const name = normalizeText(fact.projectName) || "ваш проект";
  const niche = normalizeText(fact.niche);
  const geo = normalizeText(fact.geo);
  const goal = normalizeText(fact.goal);
  const product = describeProductService(fact) || "не указано";
  const avgCheck = normalizeText(fact.economics.averageCheck);
  const margin = normalizeText(fact.economics.marginPercent);

  const curRev = parseNum(fact.currentRevenue) ?? parseNum(fact.pointA.revenue);
  const curCli = parseNum(fact.currentClients) ?? parseNum(fact.pointA.clients);
  const tgtRev = parseNum(fact.targetRevenue) ?? parseNum(fact.pointB.revenue);
  const tgtCli = parseNum(fact.targetClients) ?? parseNum(fact.pointB.clients);

  const sections: StrategySection[] = [];

  sections.push({
    id: "goal",
    title: "1. Цель и задача",
    paragraphs: [
      `Проект «${name}» в нише «${niche}», география: ${geo}.`,
      `Сформулированная цель: ${goal}.`,
      `Ключевое предложение: ${product}. Средний чек: ${avgCheck}.`,
      ...(curRev !== null && curCli !== null
        ? [
            `Точка А (оцифровка): выручка порядка ${fmtNum(curRev)} ₽, клиентов/сделок — ${fmtNum(curCli)} за выбранный период (как вы указали в фактуре).`,
          ]
        : [
            "Точка А задана в качественном виде — для жёсткой математики воронки позже уточните период и единицы (месяц / квартал).",
          ]),
      ...(tgtRev !== null && tgtCli !== null
        ? [
            `Точка Б: целевая выручка порядка ${fmtNum(tgtRev)} ₽, целевое число клиентов/сделок — ${fmtNum(tgtCli)}.`,
          ]
        : []),
      "Дальнейшие шаги в кабинете КНОПКИ: закрепить метрики в разделе «Данные», затем сравнивать план и факт в отчётах.",
    ],
    bullets: [
      "Точка А и точка Б зафиксированы в фактуре — при изменении бизнеса обновите их, чтобы стратегия оставалась честной.",
      "Целевые показатели должны быть измеримыми: деньги, заявки, сделки, а не только «стало лучше».",
    ],
  });

  sections.push(buildPointASection(fact, opts?.integrationsBlock));
  sections.push(buildDemandPlaceholder());
  sections.push(buildCompetitorsPlaceholder());

  const integConnected = fact.integrations.filter((i) => i.status !== "not_connected");
  const integText =
    integConnected.length > 0
      ? integConnected.map((i) => i.title).join(", ")
      : "подключения из фактуры пока не отмечены как активные";

  sections.push({
    id: "current",
    title: "5. Что есть сейчас",
    paragraphs: [
      `Каналы (из онбординга): ${joinChannels(fact)}.`,
      `Интеграции и системы: ${integText}.`,
      normalizeText(fact.goalDetails.marketingComment)
        ? `Комментарий по маркетингу: ${normalizeText(fact.goalDetails.marketingComment)}`
        : "Отдельные комментарии по маркетингу в фактуре не заполнены — при необходимости добавьте их на экране фактуры.",
      normalizeText(fact.goalDetails.analyticsComment)
        ? `Аналитика и учёт: ${normalizeText(fact.goalDetails.analyticsComment)}`
        : "",
    ].filter(Boolean),
    bullets: fact.channelBudgets
      .filter((r) => normalizeText(r.channel))
      .slice(0, 8)
      .map((r) => `${normalizeText(r.channel)} — заложено ${fmtNum(r.budget)} ₽/мес (по вашим данным).`),
  });

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
    title: "6. Декомпозиция точки Б",
    paragraphs: decParagraphs,
    bullets: [
      "Свяжите цель с воронкой: трафик → заявки → квалификация → сделка.",
      "Если средний чек растёт, потребность в количестве сделок для той же выручки снижается — пересчитайте цели.",
    ],
  });

  const withBudget = fact.channelBudgets
    .filter((r) => normalizeText(r.channel))
    .sort((a, b) => b.budget - a.budget);
  const ordered = withBudget.length
    ? withBudget.map((r) => normalizeText(r.channel))
    : [...new Set([...(fact.channels.connected ?? []), ...(fact.channels.planned ?? [])])].filter(Boolean);

  const channelBullets =
    ordered.length > 0
      ? ordered.map((ch, i) => {
          const row = fact.channelBudgets.find((r) => normalizeText(r.channel) === ch);
          const b = row && row.budget > 0 ? ` (бюджет ${fmtNum(row.budget)} ₽/мес)` : "";
          return `${i + 1}. ${ch}${b} — приоритет по важности для вашей текущей фактуры.`;
        })
      : ["Уточните каналы во втором шаге онбординга или в фактуре."];

  sections.push({
    id: "channels",
    title: "7. Каналы и приоритеты",
    paragraphs: [
      "Быстрый эффект чаще дают каналы с уже тёплой аудиторией и понятным спросом (контекст по высокоинтентным запросам, маркетплейсы, рекомендации).",
      "В долгую работают контент, SEO, бренд и работа с повторными продажами — их разумно подключать, когда поток заявок стабилен.",
      "Не запускайте всё сразу: 1–2 опорных канала + измеримость (цели, метки, CRM).",
    ],
    bullets: channelBullets,
  });

  const specBullets = fact.specialistCosts
    .filter((r) => normalizeText(r.role))
    .map(
      (r) =>
        `${normalizeText(r.role)}: ${r.cost > 0 ? `ориентир ${fmtNum(r.cost)} ₽/мес` : "стоимость не задана — оцените рынок или запросите КП у специалистов"}`
    );

  sections.push({
    id: "budget",
    title: "8. Бюджеты и специалисты",
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

  sections.push({
    id: "next",
    title: "9. Что делать дальше",
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
    factSnapshotUpdatedAt: fact.updatedAt,
    sections,
  };
}
