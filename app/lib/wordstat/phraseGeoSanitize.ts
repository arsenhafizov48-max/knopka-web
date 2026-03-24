/**
 * Убираем из ключевых фраз топонимы, если география уже задана параметром regions в API Вордстата
 * (как в UI: запрос «маркетинговое агентство» + фильтр «Казань», без «… казань» в строке).
 */

const RUSSIA_GENERIC =
  /^(рф|р\.?\s*ф\.?|россия|российская\s*федерация|вся\s*россия|по\s*россии|вся\s*рф)$/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Токены из поля «География» в фактуре — для вырезания из фраз. */
export function extractGeoTokensForStripping(geoRaw: string): string[] {
  const out = new Set<string>();
  const parts = geoRaw
    .split(/[,;/|]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (let raw of parts) {
    if (RUSSIA_GENERIC.test(raw)) continue;
    raw = raw
      .replace(/^(г\.?|город|пос[ёе]лок|пгт\.?)\s+/i, "")
      .replace(/\s+область$/i, "")
      .replace(/\s+край$/i, "")
      .replace(/\s+республика$/i, "")
      .trim();
    if (raw.length < 2) continue;
    out.add(raw);
    const noResp = raw.replace(/^республика\s+/i, "").trim();
    if (noResp.length >= 2 && noResp !== raw) out.add(noResp);
  }

  return [...out].sort((a, b) => b.length - a.length);
}

/**
 * Срезает хвост/начало фразы по токенам гео (кириллица: без \b).
 * Возвращает исходную фразу, если после очистки слишком коротко.
 */
export function stripGeoTokensFromPhrase(phrase: string, tokens: string[]): string {
  const orig = phrase.trim().replace(/\s+/g, " ");
  if (!tokens.length || !orig) return orig;

  let p = orig;
  for (const tok of tokens) {
    if (tok.length < 2) continue;
    const esc = escapeRe(tok);
    // хвост: « … казань», « … в казани»
    p = p
      .replace(
        new RegExp(`(?:\\s+в\\s+${esc})(?:[,.])?\\s*$`, "iu"),
        ""
      )
      .replace(new RegExp(`\\s+${esc}(?:[,.])?\\s*$`, "iu"), "")
      .trim();
    // начало: «казань …»
    p = p
      .replace(new RegExp(`^${esc}(?:[,.])?\\s+`, "iu"), "")
      .trim();
  }

  p = p.replace(/\s+/g, " ").trim();
  return p.length >= 2 ? p : orig;
}
