// app/components/Header.tsx
import Link from "next/link";

function KnopkaMark() {
  return (
    <div className="flex items-center gap-4">
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="6" y="10" width="6" height="6" rx="1.2" fill="#7C5CFF" />
        <rect x="14" y="2" width="6" height="6" rx="1.2" fill="#7C5CFF" />
        <rect x="14" y="18" width="6" height="6" rx="1.2" fill="#7C5CFF" />
        <rect x="22" y="10" width="6" height="6" rx="1.2" fill="#7C5CFF" />

        <rect x="14" y="10" width="6" height="6" rx="1.2" fill="#A08BFF" />
        <rect x="6" y="18" width="6" height="6" rx="1.2" fill="#A08BFF" />
        <rect x="22" y="18" width="6" height="6" rx="1.2" fill="#A08BFF" />
        <rect x="14" y="26" width="6" height="6" rx="1.2" fill="#A08BFF" />
      </svg>

      <div className="flex items-baseline gap-1">
        <span className="text-[34px] font-extrabold tracking-[-0.02em] text-[#111827]">КНОПКА</span>
        <span className="text-[34px] font-extrabold text-[#7C5CFF]">.</span>
      </div>

      <div className="h-10 w-px bg-black/10" />
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="#111827"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  const active = "ПОТОК КЛИЕНТОВ";

  const nav = [
    "ПОТОК КЛИЕНТОВ",
    "СОЗДАНИЕ САЙТОВ",
    "БЛОГ",
    "SEO-ПРОДВИЖЕНИЕ",
    "РАЗРАБОТКА БРЕНДА",
  ];

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-10 py-6">
        <KnopkaMark />

        <div className="flex items-center gap-8">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-black/10 shadow-sm"
            aria-label="Домой"
          >
            <HomeIcon />
          </button>

          <nav className="flex items-center gap-7 text-[13px] font-medium text-[#111827]">
            {nav.map((t) => {
              const isActive = t === active;
              return (
                <Link
                  key={t}
                  href="#"
                  className={[
                    "relative pb-2 transition",
                    isActive ? "text-[#7C5CFF]" : "text-[#111827]/80 hover:text-[#111827]",
                  ].join(" ")}
                >
                  {t}
                  <span
                    className={[
                      "absolute left-0 -bottom-[2px] h-[2px] w-full rounded-full transition",
                      isActive ? "bg-[#7C5CFF]" : "bg-transparent",
                    ].join(" ")}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        <a
          href="#"
          className="inline-flex items-center gap-3 rounded-[18px] bg-white px-6 py-4 text-[14px] font-medium text-[#111827] shadow-[0_12px_40px_rgba(16,24,40,0.10)] ring-1 ring-black/10 hover:bg-[#FAFAFA]"
        >
          Закажите демо-сервис
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white ring-1 ring-black/10">
            <span className="text-[14px] opacity-70">↗</span>
          </span>
        </a>
      </div>
    </header>
  );
}
