import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { ensureYandexMetrikaAccessToken } from "@/app/lib/yandexMetrikaEnsureToken";
import { syncYandexMetrikaCounter } from "@/app/lib/yandexMetrikaSync";

/** Список счётчиков из API Метрики (для выбора). */
export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  try {
    const token = await ensureYandexMetrikaAccessToken(admin, user.id);
    const res = await fetch("https://api-metrika.yandex.net/management/v1/counters", {
      headers: { Authorization: `OAuth ${token}` },
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return NextResponse.json({ error: "management_api_not_json" }, { status: 502 });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: typeof json === "object" && json && "message" in json ? (json as any).message : text },
        { status: res.status }
      );
    }
    const j = json as { counters?: Array<{ id?: number; name?: string; site?: string }> };
    const counters = (j.counters ?? []).map((c) => ({
      id: c.id,
      name: c.name ?? "",
      site: c.site ?? "",
    }));
    return NextResponse.json({ counters });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

type PostBody = { counterId?: number };

/** Добавить счётчик по номеру и сразу синхронизировать. */
export async function POST(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const counterId = typeof body.counterId === "number" ? body.counterId : Number(body.counterId);
  if (!Number.isFinite(counterId) || counterId <= 0) {
    return NextResponse.json({ error: "counterId required" }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  try {
    const token = await ensureYandexMetrikaAccessToken(admin, user.id);
    const res = await fetch(
      `https://api-metrika.yandex.net/management/v1/counter/${counterId}`,
      { headers: { Authorization: `OAuth ${token}` } }
    );
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: t.slice(0, 300) || "counter_not_accessible" }, { status: 400 });
    }
    const cj = (await res.json()) as { counter?: { id?: number; name?: string; site?: string } };
    const name = cj.counter?.name ?? "";
    const site = cj.counter?.site ?? "";
    const siteName = site || name || String(counterId);

    const { data: existing } = await admin
      .from("yandex_metrika_counters")
      .select("id")
      .eq("user_id", user.id)
      .eq("counter_id", counterId)
      .maybeSingle();

    let rowId: string;
    if (existing?.id) {
      rowId = existing.id as string;
      await admin
        .from("yandex_metrika_counters")
        .update({ site_name: siteName })
        .eq("id", rowId);
    } else {
      const { data: ins, error: insErr } = await admin
        .from("yandex_metrika_counters")
        .insert({
          user_id: user.id,
          counter_id: counterId,
          site_name: siteName,
        })
        .select("id")
        .single();
      if (insErr || !ins) {
        return NextResponse.json({ error: insErr?.message ?? "insert_failed" }, { status: 500 });
      }
      rowId = (ins as { id: string }).id;
    }
    const sync = await syncYandexMetrikaCounter(admin, user.id, rowId);
    if (!sync.ok) {
      return NextResponse.json({
        ok: false,
        counterId: rowId,
        error: sync.message,
      });
    }

    return NextResponse.json({ ok: true, counterId: rowId, syncedAt: sync.payload.syncedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  const { error } = await admin
    .from("yandex_metrika_counters")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
