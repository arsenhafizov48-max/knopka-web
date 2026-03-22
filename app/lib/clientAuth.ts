import type { SupabaseClient } from "@supabase/supabase-js";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";

type MiniRouter = {
  push: (href: string) => void;
  refresh: () => void;
};

/** Выход из Supabase (если не dev-skip) и переход на /login */
export async function clientSignOutToLogin(
  supabase: SupabaseClient,
  router: MiniRouter
) {
  if (!DEV_SKIP_AUTH) {
    await supabase.auth.signOut();
  }
  router.push("/login");
  router.refresh();
}
