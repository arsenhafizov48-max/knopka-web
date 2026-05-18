"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import AppSidebar from "@/app/components/AppSidebar";
import AppTopbar from "@/app/components/AppTopbar";
import { getFactStatus } from "./lib/projectFact";

const SIDEBAR_W = 280;
const SIDEBAR_W_COLLAPSED = 88;
const STICKY_TOP = 96;

const ONBOARDING_PREFIX = "/app/onboarding";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isOnboardingPage = useMemo(() => {
    return (pathname ?? "").startsWith(ONBOARDING_PREFIX);
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("knopka.sidebarCollapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (isOnboardingPage) return;

    const status = getFactStatus();
    if (!status.started) {
      router.replace("/app/onboarding/step-1");
    }
  }, [pathname, router, isOnboardingPage]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem("knopka.sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="sticky top-0 z-50 border-b border-white/5 bg-[#070b14]/90 backdrop-blur-md">
        <div className="px-4 py-3 lg:px-5">
          <AppTopbar />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-none gap-5 px-4 pb-8 pt-4 lg:px-5">
        {!isOnboardingPage ? (
          <aside
            className="hidden shrink-0 lg:block transition-[width] duration-200 ease-out"
            style={{ width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W }}
          >
            <div className="sticky" style={{ top: STICKY_TOP }}>
              <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">
          {isOnboardingPage ? (
            <div>{children}</div>
          ) : (
            <div className="min-w-0">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
