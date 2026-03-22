"use client";

import { useEffect } from "react";

export type ToastVariant = "success" | "warning" | "error";

/**
 * Важно: пропсы сделаны мягкими,
 * чтобы старые вызовы типа <SaveToast open={...} /> не падали по TS.
 */
export default function SaveToast({
  open,
  onClose,
  title = "Данные сохранены",
  description,
  variant = "success",
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose?.(), 1600);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div className="fixed bottom-5 right-5 z-[200]">
      <div
        className={["w-[320px] rounded-2xl border p-4 shadow-sm", styles].join(
          " "
        )}
      >
        <div className="text-sm font-semibold">{title}</div>
        {description ? (
          <div className="mt-1 text-xs opacity-80">{description}</div>
        ) : null}
      </div>
    </div>
  );
}
