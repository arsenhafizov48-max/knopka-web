"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import AccountSignOut from "@/app/components/AccountSignOut";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";

/** Подтягивает email сессии для блока выхода на странице настроек */
export default function AccountSignOutHost() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setEmail(null);
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return <AccountSignOut email={email} variant="card" />;
}
