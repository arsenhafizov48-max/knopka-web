import { buildSnapshot, deltaPercent, getPeriodRange } from "./compute";

function fmtInt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function fmtMoney(n: number) {
  return `${fmtInt(n)} ₽`;
}

function fmtDelta(cur: number, prev: number): string | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return "рост от нуля в прошлом периоде";
  const d = deltaPercent(cur, prev);
  if (d === null) return null;
  const pct = (Math.abs(d) * 100).toFixed(1);
  const word = d >= 0 ? "выше" : "ниже";
  return `на ${pct}% ${word}, чем в прошлом периоде`;
}

function periodTitle(from: string, to: string) {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const a = parse(from).toLocaleDateString("ru-RU", opts);
  if (from === to) return a;
  const b = parse(to).toLocaleDateString("ru-RU", opts);
  return `${a} — ${b}`;
}

export type PeriodReportKpi = {
  label: string;
  value: string;
  hint?: string;
};

export type PeriodReportSection = {
  heading: string;
  bullets: string[];
};

export type PeriodReportDocument = {
  kind: "week" | "month";
  periodTitle: string;
  compareNote: string;
  kpis: PeriodReportKpi[];
  sections: PeriodReportSection[];
};

export function buildPeriodReportDocument(
  kind: "week" | "month",
  baseDate: string
): PeriodReportDocument {
  const preset = kind === "week" ? "week" : "month";
  const range = getPeriodRange({ preset, baseDate });
  const { current, previous } = buildSnapshot(range);

  const c = current.sum;
  const cDer = current.derived;
  const p = previous.sum;

  const hasData =
    c.leads +
      c.revenue +
      c.spend +
      c.sales +
      c.calls +
      c.sql +
      c.funnelNewLeads +
      c.funnelClosedWon >
    0;

  const periodTitleStr = periodTitle(range.from, range.to);

  const kpis: PeriodReportKpi[] = [
    {
      label: "Заявки (каналы)",
      value: fmtInt(c.leads),
      hint: fmtDelta(c.leads, p.leads) ?? undefined,
    },
    {
      label: "Расход на рекламу",
      value: fmtMoney(c.spend),
      hint: fmtDelta(c.spend, p.spend) ?? undefined,
    },
    {
      label: "Выручка",
      value: fmtMoney(c.revenue),
      hint: fmtDelta(c.revenue, p.revenue) ?? undefined,
    },
    {
      label: "Сделки",
      value: fmtInt(c.sales),
      hint: fmtDelta(c.sales, p.sales) ?? undefined,
    },
  ];

  if (kind === "month") {
    kpis.push(
      {
        label: "Звонки",
        value: fmtInt(c.calls),
        hint: fmtDelta(c.calls, p.calls) ?? undefined,
      },
      {
        label: "Сообщения",
        value: fmtInt(c.messages),
        hint: fmtDelta(c.messages, p.messages) ?? undefined,
      },
      {
        label: "Прочие расходы",
        value: fmtMoney(c.otherExpenses),
        hint: fmtDelta(c.otherExpenses, p.otherExpenses) ?? undefined,
      }
    );
  } else {
    kpis.push({
      label: "Звонки / сообщения",
      value: `${fmtInt(c.calls)} / ${fmtInt(c.messages)}`,
    });
  }

  const sections: PeriodReportSection[] = [];

  const dyn: string[] = [];
  dyn.push(
    `Период: ${periodTitleStr}. Дней с данными в выборке: учитываются только дни, которые вы заполнили в разделе «Данные».`
  );
  dyn.push(`Квалифицированные заявки (SQL): ${fmtInt(c.sql)}. Закрыто по воронке (поле «Успешно»): ${fmtInt(c.funnelClosedWon)}.`);
  if (cDer.cpl !== null && c.leads > 0) {
    dyn.push(
      `Стоимость заявки (CPL) ориентировочно: ${fmtMoney(Math.round(cDer.cpl))} при суммарном расходе ${fmtMoney(c.spend)}.`
    );
  } else if (c.spend > 0 && c.leads === 0) {
    dyn.push("Расход есть, заявок по каналам нет — проверьте разметку и учёт лидов.");
  }
  sections.push({
    heading: kind === "week" ? "Краткая динамика" : "Динамика и KPI",
    bullets: dyn,
  });

  const worked: string[] = [];
  if (c.revenue > p.revenue && p.revenue > 0) {
    worked.push("Выручка выше, чем в сравниваемом прошлом периоде — зафиксируйте вклад каналов и офферов.");
  }
  if (c.leads > p.leads && p.leads > 0) {
    worked.push("Больше заявок с каналов — оцените качество лидов в CRM, не только объём.");
  }
  if (c.sales > p.sales && p.sales > 0) {
    worked.push("Больше сделок — проверьте, какие этапы воронки укоротились.");
  }
  if (worked.length === 0) {
    worked.push(
      hasData
        ? "Ярких улучшений относительно прошлого периода по введённым данным не видно — продолжайте ежедневный ввод."
        : "За выбранный период пока нет суммарных данных — заполните показатели по дням в разделе «Данные»."
    );
  }
  sections.push({ heading: "Что сработало", bullets: worked });

  const bad: string[] = [];
  if (p.leads > 0 && c.leads < p.leads) {
    bad.push("Заявок меньше, чем в прошлом периоде — проверьте креативы, ставки и посадочные.");
  }
  if (p.revenue > 0 && c.revenue < p.revenue) {
    bad.push("Выручка ниже прошлого периода — сверьте конверсию в продажу и средний чек.");
  }
  if (c.spend > p.spend && c.leads <= p.leads && p.leads > 0) {
    bad.push("Расход вырос при не росте заявок — остановите слабые связки и пересмотрите аудитории.");
  }
  if (bad.length === 0) {
    bad.push("Выраженных просадок к прошлому периоду по введённым цифрам нет или данных мало для вывода.");
  }
  sections.push({ heading: "Где просадка", bullets: bad });

  const nextWeek = [
    "Согласуйте с командой 1–2 приоритета на неделю (канал + метрика).",
    "Внесите данные хотя бы за ключевые дни — отчёт станет точнее.",
    "Сверьте факт с блоком «Стратегия» в КНОПКЕ и скорректируйте гипотезы.",
  ];
  const nextMonth = [
    "Сведите ROMI по каналам и решите, что масштабировать, а что отключить.",
    "Обновите фактуру бизнеса, если изменились цели или экономика.",
    "Проведите разбор воронки: от заявки до оплаты, где теряется больше всего.",
    "Запланируйте эксперименты на следующий месяц с лимитом бюджета.",
  ];
  sections.push({
    heading: kind === "week" ? "Что делать на следующей неделе" : "Приоритеты на следующий месяц",
    bullets: kind === "week" ? nextWeek : nextMonth,
  });

  if (kind === "month") {
    sections.push({
      heading: "Риски",
      bullets: [
        "Зависимость от одного канала — заложите тесты альтернатив.",
        "Разрыв между заявками и сделками — проверьте скорость ответа и квалификацию.",
        "Неполный ввод данных искажает картину — закрепите ответственного за ежедневное заполнение.",
      ],
    });
  }

  return {
    kind,
    periodTitle: periodTitleStr,
    compareNote: `Сравнение с предыдущим периодом той же длины (${range.prevFrom} — ${range.prevTo}).`,
    kpis,
    sections,
  };
}
