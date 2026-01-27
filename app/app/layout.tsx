"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import AppSidebar from "@/app/components/AppSidebar";
import AppTopbar from "@/app/components/AppTopbar";
import { getFactStatus } from "./lib/projectFact";

const SIDEBAR_W = 280;
const SIDEBAR_W_COLLAPSED = 88;
const STICKY_TOP = 96;

const ONBOARDING_PREFIX = "/app/onborarding";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = window.localStorage.getItem("knopka.sidebarCollapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!pathname) return;

    const isOnboardingPage = pathname.startsWith(ONBOARDING_PREFIX);
    if (isOnboardingPage) return;

    const status = getFactStatus();

    // ЛОГИКА, КАК ТЫ ХОЧЕШЬ:
    // - если вообще не начинал → в онбординг
    // - если начал (даже не закончил) → пускаем в кабинет
    if (!status.started) {
      router.replace("/app/onborarding/step-1");
    }
  }, [pathname, router]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem("knopka.sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <div className="sticky top-0 z-50 bg-[#F4F7FF]">
        <div className="px-[15px] pt-6">
          <div className="rounded-2xl border border-neutral-200/70 bg-white/0 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <AppTopbar />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-none gap-6 px-[15px] py-6">
        <aside
          className="hidden shrink-0 lg:block transition-[width] duration-200 ease-out"
          style={{ width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W }}
        >
          <div className="sticky" style={{ top: STICKY_TOP }}>
            <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_1px_0_rgba(16,24,40,0.04)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
