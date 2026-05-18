"use client";

/** Составная premium-сцена hero: ядро, столбцы, чек-лист, орбиты */
export function HeroGrowthScene() {
  return (
    <div className="relative mx-auto h-[200px] w-full max-w-[340px] shrink-0 lg:mx-0 lg:h-[220px] lg:max-w-[380px]" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-[50px]" />
      <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-cyan-500/15 blur-[40px]" />

      <svg viewBox="0 0 380 220" className="relative h-full w-full">
        <defs>
          <linearGradient id="hCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="hBar3d" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#67E8F9" />
          </linearGradient>
          <linearGradient id="hCard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(30,58,95,0.95)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.9)" />
          </linearGradient>
          <filter id="hGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* орбиты */}
        <ellipse cx="175" cy="115" rx="120" ry="48" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="1" />
        <ellipse cx="175" cy="115" rx="95" ry="36" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="1" strokeDasharray="4 6" />
        <path d="M95 80 Q175 40 265 95" fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5" />
        <path d="M120 150 Q200 175 280 130" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

        {/* growth core / donut */}
        <g transform="translate(72, 88)" filter="url(#hGlow)">
          <circle r="42" fill="rgba(15,23,42,0.6)" />
          <circle r="38" fill="none" stroke="url(#hCore)" strokeWidth="10" strokeDasharray="180 60" strokeLinecap="round" />
          <circle r="38" fill="none" stroke="#22D3EE" strokeWidth="10" strokeDasharray="50 190" strokeDashoffset="-120" strokeLinecap="round" opacity="0.85" />
          <circle r="22" fill="url(#hCore)" opacity="0.35" />
          <circle r="14" fill="#0f172a" stroke="rgba(96,165,250,0.4)" strokeWidth="1" />
          <circle r="6" fill="#22D3EE" className="animate-pulse" />
        </g>

        {/* 3D bars + arrow */}
        <g transform="translate(168, 72)">
          <rect x="8" y="58" width="18" height="42" rx="4" fill="url(#hBar3d)" opacity="0.75" />
          <rect x="32" y="42" width="18" height="58" rx="4" fill="url(#hBar3d)" />
          <rect x="56" y="28" width="18" height="72" rx="4" fill="url(#hBar3d)" opacity="0.95" />
          <rect x="80" y="38" width="18" height="62" rx="4" fill="url(#hBar3d)" opacity="0.85" />
          <path d="M102 88 L118 52 L114 68 L128 64 Z" fill="#22D3EE" opacity="0.95" />
          <path d="M8 100 L128 100" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
        </g>

        {/* floating checklist card */}
        <g transform="translate(248, 28)">
          <rect width="118" height="78" rx="12" fill="url(#hCard)" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
          <rect x="12" y="14" width="48" height="6" rx="3" fill="rgba(96,165,250,0.35)" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(12, ${32 + i * 12})`}>
              <rect width="8" height="8" rx="2" fill={i < 2 ? "rgba(52,211,153,0.5)" : "rgba(100,116,139,0.3)"} />
              <rect x="14" y="1" width={72 - i * 8} height="5" rx="2" fill="rgba(148,163,184,0.25)" />
            </g>
          ))}
        </g>

        {/* connector nodes */}
        <circle cx="130" cy="100" r="3" fill="#60A5FA" opacity="0.8" />
        <circle cx="248" cy="95" r="3" fill="#22D3EE" opacity="0.7" />
        <circle cx="310" cy="68" r="2.5" fill="#A78BFA" />
      </svg>
    </div>
  );
}

/** AI-core вместо робота */
export function KnopkaAiCore({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  const ring = size === "sm" ? "h-[72px] w-[72px]" : "h-[88px] w-[88px]";
  return (
    <div className={`relative shrink-0 ${ring}`}>
      <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20 blur-md" />
      <div className="absolute inset-2 rounded-full border border-cyan-400/20" />
      <div className="absolute inset-3 rounded-full border border-blue-400/30 bg-gradient-to-br from-blue-600/20 to-violet-700/30" />
      <div
        className={`absolute left-1/2 top-1/2 ${dim} -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#0891b2] shadow-[0_0_32px_rgba(37,99,235,0.55),inset_0_2px_12px_rgba(255,255,255,0.15)]`}
      >
        <div className="absolute inset-[22%] rounded-full bg-cyan-300/90 blur-[2px] opacity-90" />
        <div className="absolute inset-[38%] rounded-full bg-white/90 shadow-[0_0_16px_#67e8f9]" />
      </div>
      {[0, 45, 90, 135].map((deg) => (
        <span
          key={deg}
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/60"
          style={{ transform: `rotate(${deg}deg) translateY(-${size === "sm" ? 34 : 40}px)` }}
        />
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  stroke = "#60A5FA",
}: {
  values: number[];
  stroke?: string;
}) {
  const w = 72;
  const h = 28;
  const max = Math.max(...values, 1);
  const pts =
    values.length < 2
      ? `0,${h / 2} ${w},${h / 2}`
      : values
          .map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const y = h - (v / max) * (h - 6) - 3;
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible opacity-90">
      <polyline fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" points={pts} />
    </svg>
  );
}

export function RevenueChart({
  points,
  formatRub,
}: {
  points: { date: string; revenue: number }[];
  formatRub: (n: number | null | undefined) => string;
}) {
  const hasData = points.length >= 2 && points.some((p) => p.revenue > 0);
  const w = 300;
  const h = 110;
  const max = Math.max(...points.map((p) => p.revenue), 1);

  const label = (d: string) => {
    const p = d.split("-");
    if (p.length === 3) return `${p[2]}.${p[1]}`;
    return d;
  };

  if (!hasData) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 18 L8 12 L12 15 L16 8 L20 11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300">Пока не хватает данных для динамики</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Подключите источники или внесите показатели вручную
        </p>
      </div>
    );
  }

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p.revenue / max) * (h - 16) - 8;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const last = points[points.length - 1]!;
  const lastX = w;
  const lastY = h - (last.revenue / max) * (h - 16) - 8;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[110px] w-full">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map((t) => (
          <line key={t} x1={0} y1={h * t} x2={w} y2={h * t} stroke="rgba(255,255,255,0.05)" />
        ))}
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#revFill)" />
        <path d={path} fill="none" stroke="#60A5FA" strokeWidth="2.5" filter="drop-shadow(0 0 8px rgba(96,165,250,0.5))" />
        <circle cx={lastX} cy={lastY} r="5" fill="#60A5FA" />
        <circle cx={lastX} cy={lastY} r="11" fill="rgba(96,165,250,0.15)" />
      </svg>
      <div
        className="pointer-events-none absolute rounded-lg border border-blue-400/35 bg-[#152238]/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm"
        style={{ right: "4%", top: "12%" }}
      >
        {formatRub(last.revenue)}
        <span className="ml-1.5 font-normal text-slate-400">{label(last.date)}</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{label(points[0]!.date)}</span>
        <span>{label(last.date)}</span>
      </div>
    </div>
  );
}

/** Траектория А → Б */
export function PointABRoute() {
  return (
    <div className="relative hidden w-10 shrink-0 items-center justify-center sm:flex">
      <svg width="40" height="80" viewBox="0 0 40 80" className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <path
          d="M20 8 Q28 40 20 72"
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity="0.7"
        />
        <polygon points="16,68 20,76 24,68" fill="#A78BFA" opacity="0.9" />
      </svg>
    </div>
  );
}

