import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureYandexDirectAccessToken } from "@/app/lib/yandexDirectEnsureToken";
import { directGetAllPages } from "@/app/lib/yandexDirectJsonRpc";
import { getYandexLogin } from "@/app/lib/yandexPassportLogin";

export type YandexSnapshotPayloadV1 = {
  version: 1;
  syncedAt: string;
  /** Логин для Client-Login в Direct API (если удалось получить с login.yandex.ru). */
  yandexLogin?: string | null;
  campaigns: unknown[];
  adGroups: unknown[];
  ads: unknown[];
  keywords: unknown[];
  counts: {
    campaigns: number;
    adGroups: number;
    ads: number;
    keywords: number;
  };
};

const CAMPAIGN_FIELDS = [
  "Id",
  "Name",
  "Type",
  "Status",
  "State",
  "DailyBudget",
  "Currency",
  "Funds",
  "RepresentedById",
  "NegativeKeywords",
  "BlockedIps",
  "EndDate",
  "StartDate",
];

const ADGROUP_FIELDS = [
  "Id",
  "Name",
  "CampaignId",
  "Status",
  "State",
  "RegionIds",
  "NegativeKeywords",
  "TrackingParams",
  "ServingStatus",
];

const AD_FIELDS = [
  "Id",
  "AdGroupId",
  "CampaignId",
  "Status",
  "State",
  "Type",
  "TextAd",
  "MobileAppAd",
  "ResponsiveAd",
  "CpmBannerAd",
  "AdImageAd",
];

const KEYWORD_FIELDS = [
  "Id",
  "AdGroupId",
  "CampaignId",
  "Keyword",
  "State",
  "Status",
  "Bid",
  "ContextBid",
  "StrategyPriority",
  "Productivity",
  "UserParam1",
  "UserParam2",
];

async function safeGetAll<K extends string, T>(
  label: string,
  fn: () => Promise<T[]>
): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${label}: ${msg}`);
  }
}

/** Убираем поля, которые API не отдаёт для части аккаунтов — повтор с укороченным списком. */
async function getCampaignsWithFallback(
  token: string,
  clientLogin: string | null
): Promise<unknown[]> {
  try {
    return await directGetAllPages("campaigns", "Campaigns", CAMPAIGN_FIELDS, token, {}, clientLogin);
  } catch {
    const minimal = ["Id", "Name", "Type", "Status", "State", "DailyBudget", "Currency"];
    return directGetAllPages("campaigns", "Campaigns", minimal, token, {}, clientLogin);
  }
}

async function getAdGroupsWithFallback(
  token: string,
  clientLogin: string | null
): Promise<unknown[]> {
  try {
    return await directGetAllPages("adgroups", "AdGroups", ADGROUP_FIELDS, token, {}, clientLogin);
  } catch {
    const minimal = ["Id", "Name", "CampaignId", "Status", "State"];
    return directGetAllPages("adgroups", "AdGroups", minimal, token, {}, clientLogin);
  }
}

async function getAdsWithFallback(token: string, clientLogin: string | null): Promise<unknown[]> {
  try {
    return await directGetAllPages("ads", "Ads", AD_FIELDS, token, {}, clientLogin);
  } catch {
    const minimal = ["Id", "AdGroupId", "CampaignId", "Status", "State", "Type"];
    return directGetAllPages("ads", "Ads", minimal, token, {}, clientLogin);
  }
}

async function getKeywordsWithFallback(
  token: string,
  clientLogin: string | null
): Promise<unknown[]> {
  try {
    return await directGetAllPages("keywords", "Keywords", KEYWORD_FIELDS, token, {}, clientLogin);
  } catch {
    const minimal = ["Id", "AdGroupId", "CampaignId", "Keyword", "State", "Status", "Bid"];
    return directGetAllPages("keywords", "Keywords", minimal, token, {}, clientLogin);
  }
}

export async function syncYandexDirectStructure(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true; payload: YandexSnapshotPayloadV1 } | { ok: false; message: string }> {
  try {
    const token = await ensureYandexDirectAccessToken(admin, userId);
    const clientLogin = await getYandexLogin(token).catch(() => null);

    const [campaigns, adGroups, ads, keywords] = await Promise.all([
      safeGetAll("Кампании", () => getCampaignsWithFallback(token, clientLogin)),
      safeGetAll("Группы", () => getAdGroupsWithFallback(token, clientLogin)),
      safeGetAll("Объявления", () => getAdsWithFallback(token, clientLogin)),
      safeGetAll("Ключевые фразы", () => getKeywordsWithFallback(token, clientLogin)),
    ]);

    const syncedAt = new Date().toISOString();
    const payload: YandexSnapshotPayloadV1 = {
      version: 1,
      syncedAt,
      yandexLogin: clientLogin,
      campaigns,
      adGroups,
      ads,
      keywords,
      counts: {
        campaigns: campaigns.length,
        adGroups: adGroups.length,
        ads: ads.length,
        keywords: keywords.length,
      },
    };

    const { error } = await admin.from("yandex_direct_snapshot").upsert(
      {
        user_id: userId,
        payload: payload as unknown as Record<string, unknown>,
        sync_status: "ok",
        error_message: null,
        synced_at: syncedAt,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, payload };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const syncedAt = new Date().toISOString();
    await admin.from("yandex_direct_snapshot").upsert(
      {
        user_id: userId,
        payload: { version: 1, syncedAt, error: message } as unknown as Record<string, unknown>,
        sync_status: "error",
        error_message: message,
        synced_at: syncedAt,
      },
      { onConflict: "user_id" }
    );
    return { ok: false, message };
  }
}
