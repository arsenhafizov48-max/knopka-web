import type { SupabaseClient } from "@supabase/supabase-js";

/** Сообщение в БД (можно расширять полями для сортировки / аудита). */
export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
  at?: string;
};

const TABLE = "gigachat_strategy_thread";
const MAX_MESSAGES = 120;

function clampMessages(messages: StoredChatMessage[]): StoredChatMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(-MAX_MESSAGES);
}

function parseMessages(raw: unknown): StoredChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredChatMessage[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "assistant") continue;
    if (typeof r.content !== "string") continue;
    const content = r.content.trim();
    if (!content) continue;
    const at = typeof r.at === "string" ? r.at : undefined;
    out.push({ role: r.role, content, at });
  }
  return out;
}

/** Загрузить историю чата стратегии для текущего пользователя. */
export async function loadStrategyThread(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredChatMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("messages")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[КНОПКА] gigachat_strategy_thread read:", error.message);
    return [];
  }
  return parseMessages(data?.messages);
}

/**
 * Сохранить историю (upsert). Укорачивает хвост до MAX_MESSAGES — достаточно для Free и для 100k MAU при умеренной длине сообщений.
 */
export async function saveStrategyThread(
  supabase: SupabaseClient,
  userId: string,
  turns: Array<{ role: "user" | "assistant"; content: string }>
): Promise<boolean> {
  const now = new Date().toISOString();
  const messages: StoredChatMessage[] = clampMessages(
    turns.map((t) => ({
      role: t.role,
      content: t.content,
      at: now,
    }))
  );

  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      messages,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("[КНОПКА] gigachat_strategy_thread save:", error.message);
    return false;
  }
  return true;
}
