import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureYandexDirectAccessToken } from "@/app/lib/yandexDirectEnsureToken";
import { directGetAllPages } from "@/app/lib/yandexDirectJsonRpc";
import { getYandexLogin } from "@/app/lib/yandexPassportLogin";

export type YandexSnapshotPayloadV1 = {
  version: 1;
  syncedAt: string;
  /** Логин для Client-Login в Direct API (если удалось получить с login.yandex.ru). */
  yandexLogin?: string | null;
  /** Части выгрузки, которые API не отдал (остальное в снимке есть). */
  syncWarnings?: string[];
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

async function tryGetAll(label: string, fn: () => Promise<unknown[]>): Promise<
  { ok: true; data: unknown[] } | { ok: false; warning: string }
> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, warning: `${label}: ${msg}` };
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
  const minimal = ["Id", "AdGroupId", "CampaignId", "Status", "State", "Type"];
  const bare = ["Id", "AdGroupId", "CampaignId"];
  try {
    return await directGetAllPages("ads", "Ads", AD_FIELDS, token, {}, clientLogin);
  } catch {
    try {
      return await directGetAllPages("ads", "Ads", minimal, token, {}, clientLogin);
    } catch {
      return await directGetAllPages("ads", "Ads", bare, token, {}, clientLogin);
    }
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

    const [rCamp, rAg, rAds, rKw] = await Promise.all([
      tryGetAll("Кампании", () => getCampaignsWithFallback(token, clientLogin)),
      tryGetAll("Группы", () => getAdGroupsWithFallback(token, clientLogin)),
      tryGetAll("Объявления", () => getAdsWithFallback(token, clientLogin)),
      tryGetAll("Ключевые фразы", () => getKeywordsWithFallback(token, clientLogin)),
    ]);

    const warnings: string[] = [];
    const campaigns = rCamp.ok ? rCamp.data : (warnings.push(rCamp.warning), []);
    const adGroups = rAg.ok ? rAg.data : (warnings.push(rAg.warning), []);
    const ads = rAds.ok ? rAds.data : (warnings.push(rAds.warning), []);
    const keywords = rKw.ok ? rKw.data : (warnings.push(rKw.warning), []);

    const allFailed = !rCamp.ok && !rAg.ok && !rAds.ok && !rKw.ok;
    if (allFailed) {
      const message = warnings.join(" · ");
      const syncedAt = new Date().toISOString();
      await admin.from("yandex_direct_snapshot").upsert(
        {
          user_id: userId,
          payload: {
            version: 1,
            syncedAt,
            yandexLogin: clientLogin,
            syncWarnings: warnings,
            campaigns,
            adGroups,
            ads,
            keywords,
            counts: { campaigns: 0, adGroups: 0, ads: 0, keywords: 0 },
          } as unknown as Record<string, unknown>,
          sync_status: "error",
          error_message: message,
          synced_at: syncedAt,
        },
        { onConflict: "user_id" }
      );
      return { ok: false, message };
    }

    const syncedAt = new Date().toISOString();
    const payload: YandexSnapshotPayloadV1 = {
      version: 1,
      syncedAt,
      yandexLogin: clientLogin,
      syncWarnings: warnings.length > 0 ? warnings : undefined,
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

    const rowStatus = warnings.length > 0 ? "partial" : "ok";
    const rowError = warnings.length > 0 ? warnings.join(" · ") : null;

    const { error } = await admin.from("yandex_direct_snapshot").upsert(
      {
        user_id: userId,
        payload: payload as unknown as Record<string, unknown>,
        sync_status: rowStatus,
        error_message: rowError,
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
