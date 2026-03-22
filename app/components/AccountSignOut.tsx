"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { clientSignOutToLogin } from "@/app/lib/clientAuth";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";

type Props = {
  email: string | null;
  variant?: "card" | "inline";
};

export default function AccountSignOut({ email, variant = "card" }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await clientSignOutToLogin(supabase, router);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {busy ? "Выход…" : "Выйти из аккаунта"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold text-neutral-900">Аккаунт</div>
      {email ? (
        <p className="mt-1 truncate text-sm text-neutral-600" title={email}>
          Вы вошли как <span className="font-medium text-neutral-800">{email}</span>
        </p>
      ) : DEV_SKIP_AUTH ? (
        <p className="mt-1 text-sm text-amber-800">
          Режим разработки: вход отключён. Кнопка ниже ведёт на страницу входа.
        </p>
      ) : (
        <p className="mt-1 text-sm text-neutral-600">Сессия не найдена.</p>
      )}

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {busy ? "Выход…" : "Выйти из личного кабинета"}
        </button>
      </div>
    </div>
  );
}
