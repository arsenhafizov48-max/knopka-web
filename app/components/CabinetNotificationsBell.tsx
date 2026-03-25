"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { buildCabinetNotifications } from "@/app/app/lib/notifications/cabinetNotifications";

const LS_DISMISSED = "knopka.notifications.dismissed.v1";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_DISMISSED);
    const a = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Колокольчик: подсказки из данных кабинета (без платных вызовов GigaChat).
 * Позже можно добавить кнопку «Сформулировать советы ИИ».
 */
export default function CabinetNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  /** Пока false — не считаем уведомления (SSR/первый кадр без LS давали «фантомный» бейдж). */
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, [version]);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("knopka:projectFactUpdated", bump);
    window.addEventListener("knopka:dailyDataUpdated", bump);
    window.addEventListener("knopka:strategyUpdated", bump);
    return () => {
      window.removeEventListener("knopka:projectFactUpdated", bump);
      window.removeEventListener("knopka:dailyDataUpdated", bump);
      window.removeEventListener("knopka:strategyUpdated", bump);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const notifications = useMemo(() => (ready ? buildCabinetNotifications() : []), [ready, version]);
  const visible = useMemo(
    () => notifications.filter((n) => !dismissed.includes(n.id)),
    [notifications, dismissed]
  );
  const count = ready ? visible.length : 0;

  const dismiss = useCallback((id: string) => {
    const next = [...new Set([...readDismissed(), id])];
    localStorage.setItem(LS_DISMISSED, JSON.stringify(next));
    setDismissed(next);
  }, []);

  const clearVisible = useCallback(() => {
    const next = [...new Set([...readDismissed(), ...visible.map((n) => n.id)])];
    localStorage.setItem(LS_DISMISSED, JSON.stringify(next));
    setDismissed(next);
  }, [visible]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Уведомления${count ? `, непрочитанных: ${count}` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B5CFF] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[min(100vw-24px,360px)] rounded-2xl border border-neutral-200 bg-white py-2 shadow-xl ring-1 ring-black/5"
          role="dialog"
          aria-label="Уведомления кабинета"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 pb-2">
            <span className="text-sm font-semibold text-neutral-900">Что сделать</span>
            {visible.length > 0 ? (
              <button
                type="button"
                onClick={clearVisible}
                className="text-xs font-medium text-[#5E4FFF] hover:underline"
              >
                Скрыть всё
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-2 py-2">
            {!ready ? (
              <p className="px-2 py-6 text-center text-sm text-neutral-500">Подгружаем подсказки…</p>
            ) : visible.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-neutral-500">Пока всё заполнено — молодец.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      n.severity === "warning"
                        ? "border-amber-200/80 bg-amber-50/60"
                        : "border-neutral-200 bg-neutral-50/80"
                    }`}
                  >
                    <div className="font-semibold text-neutral-900">{n.title}</div>
                    <p className="mt-0.5 text-neutral-700">{n.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            dismiss(n.id);
                            setOpen(false);
                          }}
                          className="inline-flex rounded-lg bg-[#6B5CFF] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#5E4FFF]"
                        >
                          Перейти
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => dismiss(n.id)}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        Скрыть
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="border-t border-neutral-100 px-3 py-2 text-[11px] text-neutral-500">
            Подсказки из твоих данных в кабинете. Позже можно подключить формулировки от GigaChat.
          </p>
        </div>
      ) : null}
    </div>
  );
}
