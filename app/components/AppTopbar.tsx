"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, MessageCircle } from "lucide-react";

import AssistantDrawer from "@/app/components/AssistantDrawer";

export default function AppTopbar() {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {/* LEFT: LOGO */}
        <div className="flex items-center gap-3">
          <Link href="/app/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDEBFF] text-sm font-semibold text-[#2B2B2B]">
              K
            </div>

            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-neutral-900">КНОПКА.</div>
              <div className="text-[12px] text-neutral-500">Личный кабинет</div>
            </div>
          </Link>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <Link
            href="/app/fact"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-white"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Фактура бизнеса</span>
            <span className="sm:hidden">Фактура</span>
          </Link>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            <MessageCircle className="h-4 w-4" />
            Чат с ИИ
          </button>

          <div className="hidden items-center gap-2 rounded-full px-2 py-2 text-xs text-neutral-600 sm:flex">
            <span>ИП Иванов • Маркетинг</span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEBFF] text-xs font-semibold text-neutral-900">
            И
          </div>
        </div>
      </div>

      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
