"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { clientSignOutToLogin } from "@/app/lib/clientAuth";

type Props = {
  collapsed?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SidebarSignOut({ collapsed = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      await clientSignOutToLogin(supabase, router);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Выйти из аккаунта"
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors",
        "text-red-700 hover:bg-red-50 disabled:opacity-60"
      )}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50">
        <LogOut className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-sm font-medium transition-all duration-200",
          collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
        )}
      >
        {busy ? "Выход…" : "Выйти"}
      </span>
    </button>
  );
}
