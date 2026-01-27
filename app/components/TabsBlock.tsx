"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type TabId = "what" | "how" | "who";

type Pill = {
  title: string;
  subtitle: string;
  image: string;
};

type TabConfig = {
  id: TabId;
  label: string;
  title: string;
  description: string;
  pills: Pill[];
};

const TAB_ORDER: TabId[] = ["what", "how", "who"];

const TABS: TabConfig[] = [
  {
    id: "what",
    label: "Что сделать",
    title: "Что сделать в первую очередь",
    description:
      "Подключаем данные, фиксируем текущее состояние и получаем короткое превью потенциала по твоей нише в городе.",
    pills: [
      {
        title: "Собираем данные",
        subtitle: "Подключение сервисов и вводные по бизнесу",
        image: "/tabs/what-1.png",
      },
      {
        title: "Панель состояния бизнеса",
        subtitle: "Где мы сейчас: зона рисков, запас и потенциал роста",
        image: "/tabs/what-2.png",
      },
      {
        title: "Показываем потенциал на 3 месяца",
        subtitle: "Ориентир по выручке/клиентам",
        image: "/tabs/what-3.png",
      },
    ],
  },
  {
    id: "how",
    label: "Как сделать",
    title: "Как сделать по шагам",
    description:
      "Разбираем рабочие решения в каналах, собираем план на 7/30/90 дней и показываем, что делаешь сам, а где нужен специалист.",
    pills: [
      {
        title: "Разбор конкурентов по каналам",
        subtitle: "Какие решения у них дают результат (по каждому каналу)",
        image: "/tabs/what-4.png",
      },
      {
        title: "План действий: 7 / 30 / 90 дней",
        subtitle: "О приоритетах: что первым, что вторым, что третьим",
        image: "/tabs/what-5.png",
      },
      {
        title: "Примеры и требования к результату",
        subtitle: "Понимаешь, какой результат считать «сильным»",
        image: "/tabs/what-6.png",
      },
    ],
  },
  {
    id: "who",
    label: "Кто сделает",
    title: "Кто сделает работу",
    description:
      "ИИ подбирает специалистов под твои планы, бюджет и подход к работе: от маркетолога-стратега до исполнителей по каналам.",
    pills: [
      {
        title: "Маркетолог-стратег",
        subtitle: "Отвечает за общую систему и рост показателей",
        image: "/tabs/what-7.png",
      },
      {
        title: "Исполнители по каналам",
        subtitle: "Директ, Авито, SMM, продакшн — кто реально нужен",
        image: "/tabs/what-8.png",
      },
      {
        title: "Проверенные подрядчики",
        subtitle: "Кейсы, цифры, понятный результат",
        image: "/tabs/what-9.png",
      },
    ],
  },
];

const TabsBlock: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<TabId>("what");

  const [activePillIndex, setActivePillIndex] = useState<Record<TabId, number>>({
    what: 0,
    how: 0,
    who: 0,
  });

  const handleTabClick = (id: TabId) => {
    setActiveTabId(id);

    if (typeof window === "undefined") return;

    const el = document.getElementById(`section-${id}`);
    if (!el) return;

    const headerOffset = 110;
    const rect = el.getBoundingClientRect();
    const targetTop = rect.top + window.scrollY - headerOffset;

    window.scrollTo({ top: targetTop, behavior: "smooth" });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sections: HTMLElement[] = [];
    TAB_ORDER.forEach((id) => {
      const el = document.getElementById(`section-${id}`);
      if (el) sections.push(el);
    });
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section-id") as TabId | null;
            if (id) setActiveTabId(id);
          }
        });
      },
      {
        root: null,
        threshold: 0.5,
      }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#F4F6FB] py-24">
      <div className="mx-auto max-w-[1720px] px-8">
        {/* Табы под шапкой, липкие */}
        <div className="sticky top-[88px] z-20">
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={[
                    "px-24 py-3 text-[16px] font-medium rounded-full transition-colors",
                    isActive
                      ? "bg-[#7A64DD] text-white"
                      : "bg-[#F8F8F8] text-[#2B2B2B] hover:bg-[#E9E9E9]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Секции подряд, как три экрана */}
        <div className="mt-16 space-y-24">
          {TABS.map((tab) => {
            const currentPillIndex = activePillIndex[tab.id];
            const currentImage =
              tab.pills[currentPillIndex]?.image ?? tab.pills[0].image;

            return (
              <section
                key={tab.id}
                id={`section-${tab.id}`}
                data-section-id={tab.id}
                className="scroll-mt-[120px]"
              >
                {/* ЗАГОЛОВОК + ПОДЗАГОЛОВОК НАД КАРТИНКОЙ */}
                <div className="mb-10 max-w-[780px]">
                  <h2 className="mb-4 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] bg-gradient-to-b from-[#2B2B2B] to-[#919191] bg-clip-text text-transparent">
                    {tab.title}
                  </h2>
                  <p className="text-[18px] leading-[1.4] text-[#919191]">
                    {tab.description}
                  </p>
                </div>

                {/* НИЖЕ — СЕТКА: слева плашки, справа картинка */}
                <div className="grid gap-12 items-start md:grid-cols-[430px_minmax(0,1fr)]">
                  {/* Левый столбец: плашки */}
                  <div className="space-y-6">
                    {tab.pills.map((pill, index) => {
                      const isActivePill = currentPillIndex === index;

                      return (
                        <button
                          key={pill.title}
                          type="button"
                          onClick={() =>
                            setActivePillIndex((prev) => ({
                              ...prev,
                              [tab.id]: index,
                            }))
                          }
                          className={[
                            "w-full text-left rounded-[28px] px-8 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all",
                            isActivePill
                              ? "bg-[#7A64DD] text-white"
                              : "bg-[#7A64DD] text-white/80 hover:text-white hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
                          ].join(" ")}
                        >
                          <div className="text-[18px] leading-[1.2] font-semibold">
                            {pill.title}
                          </div>
                          <div className="mt-2 text-[14px] leading-[1.4] text-white/90">
                            {pill.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Правый столбец — картинка */}
                  <div className="relative h-[599px] w-full overflow-hidden rounded-[32px] bg-[#D3E4FF] shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
                    <Image
                      src={currentImage}
                      alt={tab.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TabsBlock;
