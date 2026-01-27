// app/page.tsx
import Image from "next/image";
import TabsBlock from "./components/TabsBlock";
import { SupabasePing } from "./lib/SupabasePing";


export default function Home() {
  // Дизайн-кадр из Figma (DESKTOP)
  const DESIGN_W = 1920;
  const DESIGN_H = 820; // было 920 — уменьшили, чтобы убрать пустоту сверху

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#F8F8F8]">
  <div className="mx-auto flex max-w-[1920px] items-center justify-between px-8 py-8">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-[#EDEBFF]" />
      <div className="text-[18px] font-semibold text-[#111827]">КНОПКА.</div>
    </div>

    <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#111827] md:flex">
      <a className="text-[#7C5CFF]" href="#">
        ПОТОК КЛИЕНТОВ
      </a>
      <a className="opacity-80 hover:opacity-100" href="#">
        СОЗДАНИЕ САЙТОВ
      </a>
      <a className="opacity-80 hover:opacity-100" href="#">
        БЛОГ
      </a>
      <a className="opacity-80 hover:opacity-100" href="#">
        SEO-ПРОДВИЖЕНИЕ
      </a>
      <a className="opacity-80 hover:opacity-100" href="#">
        РАЗРАБОТКА БРЕНДА
      </a>
    </nav>

   <a
  href="/login"
  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-medium text-[#111827] shadow-sm ring-1 ring-black/5 hover:bg-[#FAFAFA]"
>
  Закажите демо-сервис <span className="opacity-60">↗</span>
</a>

  </div>
</header>


      {/* HERO */}
      <section className="relative overflow-hidden pt-0">
        {/* фон */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B56D8] via-[#6A6FC7] to-[#7FA9C3]" />
        {/* затемнение снизу (чтобы низ был глубже) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-b from-transparent to-black/20" />

        {/* ===== MOBILE/TABLET ===== */}
        <div className="relative mx-auto block max-w-[1200px] px-6 py-6 lg:hidden">
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
            КНОПКА - путь к клиентам в твоей нише
          </h1>

          <p className="mt-3 text-[16px] leading-[1.4] text-white/90">
            Помогает увеличить бизнес
            <br />
            Помогает увеличить прибыль и клиентов
          </p>

          <ul className="mt-5 space-y-2 text-[16px] leading-[1.4] text-white/90">
            <li className="flex gap-3">
              <span className="mt-[9px] h-[6px] w-[6px] rounded-full bg-white/90" />
              Что для этого нужно сделать?
            </li>
            <li className="flex gap-3">
              <span className="mt-[9px] h-[6px] w-[6px] rounded-full bg-white/90" />
              Как это нужно сделать?
            </li>
            <li className="flex gap-3">
              <span className="mt-[9px] h-[6px] w-[6px] rounded-full bg-white/90" />
              Кто это сделает?
            </li>
          </ul>

          <p className="mt-5 text-[16px] leading-[1.4] text-white/90">
            Контроль динамики роста твоего бизнеса и
            <br />
            подсказки по ходу действий
          </p>

          <button className="mt-6 rounded-2xl bg-[#0B0F1A] px-10 py-4 text-[14px] font-medium text-white shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:bg-black">
            Получить КНОПКУ
          </button>

          {/* картинки в столбик */}
          <div className="mt-8 space-y-5">
            <Image
              src="/hero/specialists-v2.png"
              alt="Специалисты"
              width={512}
              height={286}
              className="w-full rounded-[28px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
              priority
            />
            <Image
              src="/hero/dashboard.png"
              alt="Дашборд"
              width={1048}
              height={526}
              className="w-full rounded-[28px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
              priority
            />
            <Image
              src="/hero/status.png"
              alt="Сводка"
              width={444}
              height={257}
              className="w-full rounded-[23px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
              priority
            />
          </div>
        </div>

        {/* ===== DESKTOP: Figma 1:1 + scale под экран ===== */}
        <div className="relative mx-auto hidden w-full lg:block">
          {/* wrapper задаёт высоту = DESIGN_H * scale, чтобы секция не обрезалась */}
          <div
            className="mx-auto"
            style={{
              height: `calc(${DESIGN_H}px * min(1, (100vw / ${DESIGN_W})))`,
            }}
          >
            {/* сцена 1920, которая будет масштабироваться */}
            <div
              className="relative mx-auto"
              style={{
                width: `${DESIGN_W}px`,
                height: `${DESIGN_H}px`,
                transform: `scale(min(1, (100vw / ${DESIGN_W})))`,
                transformOrigin: "top center",
              }}
            >
              {/* ТЕКСТ — подняли вверх */}
              <div className="absolute left-[155px] top-[100px] w-[941px] text-white">
                <h1 className="text-[48px] font-semibold leading-[1.05] tracking-[-0.02em]">
                  КНОПКА — путь к клиентам в твоей нише
                </h1>

                <p className="mt-5 w-[687px] text-[24px] leading-[28px] text-white/90">
                  Помогает увеличить бизнес
                  <br />
                  Помогает увеличить прибыль и клиентов
                </p>

                <ul className="mt-6 space-y-2 text-[24px] leading-[28px] text-white/90">
                  <li className="flex gap-3">
                    <span className="mt-[11px] h-[7px] w-[7px] rounded-full bg-white/90" />
                    Что для этого нужно сделать?
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[11px] h-[7px] w-[7px] rounded-full bg-white/90" />
                    Как это нужно сделать?
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[11px] h-[7px] w-[7px] rounded-full bg-white/90" />
                    Кто это сделает?
                  </li>
                </ul>

                <p className="mt-6 w-[687px] text-[24px] leading-[28px] text-white/90">
                  Контроль динамики роста твоего бизнеса и
                  <br />
                  подсказки по ходу действий
                </p>

                <button className="mt-7 rounded-2xl bg-[#0B0F1A] px-12 py-4 text-[14px] font-medium text-white shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:bg-black">
                  Получить КНОПКУ
                </button>
              </div>

              {/* КАРТИНКИ */}
              <div className="absolute left-[975px] top-[100px] z-30">
                <Image
                  src="/hero/specialists-v2.png"
                  alt="Специалисты"
                  width={608}
                  height={405}
                  className="rounded-[28px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
                  priority
                />
              </div>

              <div className="absolute left-[766px] top-[320px] z-20">
                <Image
                  src="/hero/dashboard.png"
                  alt="Дашборд"
                  width={1048}
                  height={526}
                  className="rounded-[28px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
                  priority
                />
              </div>

              <div className="absolute left-[442px] top-[570px] z-40">
                <Image
                  src="/hero/status.png"
                  alt="Сводка по каналам"
                  width={444}
                  height={257}
                  className="rounded-[23px] shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ВТОРОЙ ЭКРАН — табы */}
      <TabsBlock />

      {/* SUPABASE PING */}
      <SupabasePing />
    </div>
  );
}
