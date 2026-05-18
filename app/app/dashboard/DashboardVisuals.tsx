"use client";

import { Bot } from "lucide-react";

/** Иллюстрация в герое — диаграммы и стрела роста как на макете */
export function HeroIllustration() {
  return (
    <div className="relative h-[140px] w-[200px] shrink-0" aria-hidden>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 via-violet-500/10 to-transparent blur-sm" />
      <svg viewBox="0 0 200 140" className="relative h-full w-full drop-shadow-[0_8px_32px_rgba(59,130,246,0.35)]">
        <defs>
          <linearGradient id="heroBar" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="52" r="28" fill="none" stroke="#3B82F6" strokeWidth="6" strokeDasharray="120 60" opacity="0.9" />
        <circle cx="48" cy="52" r="28" fill="none" stroke="#22D3EE" strokeWidth="6" strokeDasharray="40 140" strokeDashoffset="-80" opacity="0.7" />
        <rect x="95" y="78" width="14" height="32" rx="3" fill="url(#heroBar)" />
        <rect x="115" y="62" width="14" height="48" rx="3" fill="url(#heroBar)" opacity="0.85" />
        <rect x="135" y="48" width="14" height="62" rx="3" fill="url(#heroBar)" />
        <rect x="155" y="58" width="14" height="52" rx="3" fill="url(#heroBar)" opacity="0.7" />
        <path
          d="M20 108 Q60 90 90 72 T150 42"
          fill="none"
          stroke="url(#heroLine)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M150 42 L162 34 L158 48 Z" fill="#22D3EE" />
        <circle cx="150" cy="42" r="5" fill="#60A5FA" className="animate-pulse" />
      </svg>
    </div>
  );
}

export function KnopkaBotAvatar() {
  return (
    <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center">
      <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl" />
      <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-blue-400/30 bg-gradient-to-br from-[#1a3a6e] to-[#2d1b69] shadow-[0_0_24px_rgba(59,130,246,0.35)]">
        <Bot className="h-9 w-9 text-cyan-300" strokeWidth={1.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
      </div>
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
  const w = 80;
  const h = 32;
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
    <svg width={w} height={h} className="shrink-0 overflow-visible">
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
  const w = 320;
  const h = 120;
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const hasLine = points.length >= 2;

  const path = hasLine
    ? points
        .map((p, i) => {
          const x = (i / (points.length - 1)) * w;
          const y = h - (p.revenue / max) * (h - 16) - 8;
          return `${i === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ")
    : "";

  const last = points[points.length - 1];
  const lastX = hasLine ? w : w / 2;
  const lastY = last && hasLine ? h - (last.revenue / max) * (h - 16) - 8 : h / 2;

  const label = (d: string) => {
    const p = d.split("-");
    if (p.length === 3) return `${p[2]}.${p[1]}`;
    return d;
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            y1={h * t}
            x2={w}
            y2={h * t}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        {path ? (
          <>
            <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#revFill)" />
            <path
              d={path}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2.5"
              filter="drop-shadow(0 0 6px rgba(96,165,250,0.6))"
            />
          </>
        ) : (
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="rgba(96,165,250,0.3)" strokeDasharray="4 4" />
        )}
        {last && hasLine ? (
          <>
            <circle cx={lastX} cy={lastY} r="5" fill="#60A5FA" />
            <circle cx={lastX} cy={lastY} r="10" fill="rgba(96,165,250,0.2)" />
          </>
        ) : null}
      </svg>
      {last && last.revenue > 0 ? (
        <div
          className="pointer-events-none absolute rounded-lg border border-blue-400/30 bg-[#1a2540]/95 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
          style={{ right: "8%", top: "18%" }}
        >
          {formatRub(last.revenue)}
          <span className="ml-1 text-slate-400">{label(last.date)}</span>
        </div>
      ) : null}
      {points.length > 0 ? (
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>{label(points[0]!.date)}</span>
          {points.length > 1 ? <span>{label(points[points.length - 1]!.date)}</span> : null}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">Внесите выручку в ручной ввод</p>
      )}
    </div>
  );
}

export function PointABConnector() {
  return (
    <div className="relative hidden items-center justify-center px-1 sm:flex sm:flex-col">
      <svg width="24" height="48" viewBox="0 0 24 48" className="text-violet-400/80" aria-hidden>
        <path
          d="M12 4 L12 44"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
      </svg>
    </div>
  );
}
