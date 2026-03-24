import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  wordstatDynamics,
  wordstatGetRegionsTree,
  wordstatRegionsDistribution,
  wordstatTopRequests,
  wordstatUserInfo,
} from "@/app/lib/wordstat/client";
import type { WordstatDevice } from "@/app/lib/wordstat/types";

const MAX_PHRASES_BATCH = 128;

type Body =
  | { op: "userInfo" }
  | { op: "getRegionsTree" }
  | {
      op: "topRequests";
      phrase?: string;
      phrases?: string[];
      numPhrases?: number;
      regions?: number[];
      devices?: WordstatDevice[];
    }
  | {
      op: "dynamics";
      phrase: string;
      period: "monthly" | "weekly" | "daily";
      fromDate: string;
      toDate?: string;
      regions?: number[];
      devices?: WordstatDevice[];
    }
  | {
      op: "regions";
      phrase: string;
      regionType?: "cities" | "regions" | "all";
      devices?: WordstatDevice[];
    };

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * Прокси к API Вордстата. Только для авторизованных пользователей (расход квоты на весь сервис).
 * POST /api/wordstat  JSON: { op: "userInfo" | "getRegionsTree" | "topRequests" | "dynamics" | "regions", ... }
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход в аккаунт" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Некорректный JSON");
  }

  if (!body || typeof body !== "object" || typeof body.op !== "string") {
    return bad("Укажите поле op");
  }

  switch (body.op) {
    case "userInfo": {
      const r = await wordstatUserInfo();
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status === 503 ? 503 : 502 });
      return NextResponse.json(r.data);
    }
    case "getRegionsTree": {
      const r = await wordstatGetRegionsTree();
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status === 503 ? 503 : 502 });
      return NextResponse.json(r.data);
    }
    case "topRequests": {
      if (body.phrase && body.phrases?.length) {
        return bad("Укажите либо phrase, либо phrases, не оба");
      }
      if (!body.phrase && (!body.phrases || body.phrases.length === 0)) {
        return bad("Нужны phrase или phrases");
      }
      if (body.phrases && body.phrases.length > MAX_PHRASES_BATCH) {
        return bad(`Не больше ${MAX_PHRASES_BATCH} фраз за запрос`);
      }
      const r = await wordstatTopRequests({
        phrase: body.phrase,
        phrases: body.phrases,
        numPhrases: body.numPhrases,
        regions: body.regions,
        devices: body.devices,
      });
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: mapWordstatStatus(r.status) });
      return NextResponse.json(r.data);
    }
    case "dynamics": {
      if (!body.phrase?.trim()) return bad("Нужен phrase");
      if (!body.period) return bad("Нужен period");
      if (!body.fromDate?.trim()) return bad("Нужен fromDate");
      const r = await wordstatDynamics({
        phrase: body.phrase.trim(),
        period: body.period,
        fromDate: body.fromDate.trim(),
        toDate: body.toDate?.trim(),
        regions: body.regions,
        devices: body.devices,
      });
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: mapWordstatStatus(r.status) });
      return NextResponse.json(r.data);
    }
    case "regions": {
      if (!body.phrase?.trim()) return bad("Нужен phrase");
      const r = await wordstatRegionsDistribution({
        phrase: body.phrase.trim(),
        regionType: body.regionType,
        devices: body.devices,
      });
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: mapWordstatStatus(r.status) });
      return NextResponse.json(r.data);
    }
    default:
      return bad(`Неизвестный op: ${(body as { op: string }).op}`);
  }
}

function mapWordstatStatus(status: number): number {
  if (status === 429) return 429;
  if (status === 503) return 503;
  return 502;
}
