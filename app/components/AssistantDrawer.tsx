"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AssistantDrawer({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Помощник КНОПКА">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDEBFF]">
              <Sparkles className="h-4 w-4 text-neutral-800" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900">Помощник КНОПКА</div>
              <div className="text-xs text-neutral-500">ИИ-консультант по стратегии</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl border border-neutral-200 bg-[#F4F7FF] p-4 text-sm text-neutral-700">
            <p className="font-medium text-neutral-900">Скоро здесь будет диалог</p>
            <p className="mt-2 leading-relaxed">
              Мы подключим ответы по твоей фактуре, стратегии и данным. Пока загляни в разделы ниже — там уже
              можно собрать контекст для ИИ.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/app/fact" onClick={onClose} className="font-medium text-[#2B2B2B] underline-offset-2 hover:underline">
                  Фактура бизнеса
                </Link>
                <span className="text-neutral-500"> — база для советов</span>
              </li>
              <li>
                <Link href="/app/strategy" onClick={onClose} className="font-medium text-[#2B2B2B] underline-offset-2 hover:underline">
                  Стратегия
                </Link>
                <span className="text-neutral-500"> — цели и фокус</span>
              </li>
              <li>
                <Link href="/app/data" onClick={onClose} className="font-medium text-[#2B2B2B] underline-offset-2 hover:underline">
                  Данные
                </Link>
                <span className="text-neutral-500"> — цифры по каналам</span>
              </li>
            </ul>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-neutral-500">Сообщение (пока не отправляется)</label>
            <textarea
              readOnly
              rows={3}
              placeholder="Например: что улучшить в воронке за неделю?"
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            disabled
            className="w-full rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-500"
          >
            Отправить — скоро
          </button>
        </div>
      </div>
    </div>
  );
}
