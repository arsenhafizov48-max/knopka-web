import type { SupabaseClient } from "@supabase/supabase-js";

export type IntegrationTone = "ok" | "warn" | "bad" | "info";

export async function logIntegrationActivity(
  admin: SupabaseClient,
  userId: string,
  source: string,
  message: string,
  tone: IntegrationTone = "info"
): Promise<void> {
  try {
    await admin.from("integration_activity").insert({
      user_id: userId,
      source,
      message,
      tone,
    });
  } catch {
    /* не блокируем основной поток */
  }
}
