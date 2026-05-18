"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, MessageCircle } from "lucide-react";

import AssistantDrawer from "@/app/components/AssistantDrawer";
import CabinetNotificationsBell from "@/app/components/CabinetNotificationsBell";
import ProjectSwitcher from "@/app/components/ProjectSwitcher";
import { withBasePath } from "@/app/lib/publicBasePath";

export default function AppTopbar() {
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const open = () => setAssistantOpen(true);
    window.addEventListener("knopka:openAssistant", open);
    return () => window.removeEventListener("knopka:openAssistant", open);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href={withBasePath("/app/dashboard")} className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-semibold text-white">
              K
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-white">КНОПКА.</div>
              <div className="text-[12px] text-slate-400">Личный кабинет</div>
            </div>
          </Link>
          <div className="min-w-0 max-w-full sm:max-w-[16rem]">
            <ProjectSwitcher />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CabinetNotificationsBell />

          <Link
            href={withBasePath("/app/fact")}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Фактура бизнеса</span>
            <span className="sm:hidden">Фактура</span>
          </Link>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-900/30 hover:opacity-95"
          >
            <MessageCircle className="h-4 w-4" />
            Чат с ИИ
          </button>

          <div className="hidden items-center gap-2 rounded-full px-2 py-2 text-xs text-slate-400 sm:flex">
            <span>ИП Иванов • Маркетинг</span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
            И
          </div>
        </div>
      </div>

      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
