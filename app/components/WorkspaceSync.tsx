"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import {
  applyWorkspacePayloadToLocalStorage,
  collectWorkspaceFromLocalStorage,
  hasCloudData,
  mergeProjectFactJsonForInitialPull,
  normalizePayloadFromDb,
} from "@/app/app/lib/cloud/workspacePayload";
import { PROJECT_FACT_STORAGE_KEY } from "@/app/app/lib/projectFact";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";
const DEBOUNCE_MS = 2800;

/**
 * Фоновая синхронизация кабинета с Supabase (таблица knopka_workspace).
 * Требует выполнить SQL из supabase/migrations/001_knopka_workspace.sql в проекте Supabase.
 */
export default function WorkspaceSync() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const skipPushUntil = useRef(0);

  // Первичная загрузка: облако → локально, или локально → облако если строки ещё нет
  useEffect(() => {
    if (DEV_SKIP_AUTH) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { data, error } = await supabase
        .from("knopka_workspace")
        .select("payload")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn(
          "[КНОПКА] Облако недоступно (создай таблицу knopka_workspace в Supabase — см. supabase/migrations/001_knopka_workspace.sql):",
          error.message
        );
        return;
      }

      const normalized = normalizePayloadFromDb(data?.payload);

      if (normalized && hasCloudData(normalized)) {
        const localFact = window.localStorage.getItem(PROJECT_FACT_STORAGE_KEY);
        const merged: typeof normalized = {
          ...normalized,
          projectFactJson: mergeProjectFactJsonForInitialPull(
            localFact,
            normalized.projectFactJson
          ),
        };
        applyWorkspacePayloadToLocalStorage(merged);
        skipPushUntil.current = Date.now() + 800;
        return;
      }

      const local = collectWorkspaceFromLocalStorage();
      if (hasCloudData(local)) {
        const { error: upErr } = await supabase.from("knopka_workspace").upsert(
          {
            user_id: user.id,
            payload: local,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (upErr) {
          console.warn("[КНОПКА] Первая выгрузка в облако:", upErr.message);
        } else {
          skipPushUntil.current = Date.now() + 800;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Изменения в кабинете → отложенная запись в Supabase
  useEffect(() => {
    if (DEV_SKIP_AUTH) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedulePush = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (Date.now() < skipPushUntil.current) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const payload = collectWorkspaceFromLocalStorage();
        const { error } = await supabase.from("knopka_workspace").upsert(
          {
            user_id: user.id,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) {
          console.warn("[КНОПКА] Сохранение в облако:", error.message);
        }
      }, DEBOUNCE_MS);
    };

    const events = [
      "knopka:projectFactUpdated",
      "knopka:strategyUpdated",
      "knopka:dailyDataUpdated",
    ] as const;
    events.forEach((e) => window.addEventListener(e, schedulePush));

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, schedulePush));
    };
  }, [supabase]);

  return null;
}
