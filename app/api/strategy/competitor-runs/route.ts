import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    (m.includes("could not find") && m.includes("strategy_competitor_runs"))
  );
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход в аккаунт" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();

  if (id) {
    const { data, error } = await supabase
      .from("strategy_competitor_runs")
      .select(
        "id, created_at, geo, niche, fact_snapshot, sites, yandex_maps, gis2, raw_model_text"
      )
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({
          dbMissing: true,
          warning:
            "Таблица истории анализов ещё не создана в Supabase (выполните миграцию). Просмотр сохранённых запусков недоступен; новый анализ в стратегии работает.",
          run: null,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    return NextResponse.json({
      run: {
        id: data.id,
        createdAt: data.created_at,
        geo: data.geo,
        niche: data.niche,
        factSnapshot: data.fact_snapshot,
        sites: data.sites,
        yandexMaps: data.yandex_maps,
        gis2: data.gis2,
      },
    });
  }

  const { data: rows, error } = await supabase
    .from("strategy_competitor_runs")
    .select("id, created_at, geo, niche")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json({
        runs: [],
        dbMissing: true,
        warning:
          "Таблица истории анализов ещё не создана в Supabase (выполните миграцию). Список пуст; анализ конкурентов в документе стратегии при этом работает.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: rows ?? [] });
}
