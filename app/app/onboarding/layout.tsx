import type { ReactNode } from "react";
import Link from "next/link";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/app/onborarding/step-1"
            className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-[0_1px_0_rgba(16,24,40,0.04)]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EDEBFF] text-xs font-semibold text-neutral-900">
              K
            </span>
            <span className="text-sm font-semibold text-neutral-900">
              Кнопка
            </span>
          </Link>

          <Link
            href="/app/vip/help"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Нужна помощь?
          </Link>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
