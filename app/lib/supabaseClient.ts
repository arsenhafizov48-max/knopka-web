// app/lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";

/** Только для SSR/prerender (например Vercel build без env) — не для реальных запросов */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.build-placeholder-not-valid";

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const isBrowser = typeof window !== "undefined";

  if (!url || !anonKey) {
    if (!isBrowser) {
      return createBrowserClient(PLACEHOLDER_URL, PLACEHOLDER_ANON);
    }
    throw new Error(
      "Supabase env is missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(url, anonKey);
}
