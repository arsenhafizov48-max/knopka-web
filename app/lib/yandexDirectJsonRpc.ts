const DIRECT_JSON_BASE = "https://api.direct.yandex.com/json/v5";

export type DirectService = "campaigns" | "adgroups" | "ads" | "keywords";

export type DirectJsonRpcError = {
  error?: {
    error_string?: string;
    error_detail?: string;
    error_code?: number;
  };
};

export async function directJsonRpc<T>(
  service: DirectService,
  method: string,
  params: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  const url = `${DIRECT_JSON_BASE}/${service}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "ru",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ method, params }),
  });

  const json = (await res.json()) as DirectJsonRpcError & { result?: T };
  if (json.error) {
    const msg =
      json.error.error_string ||
      json.error.error_detail ||
      `Direct API error ${json.error.error_code ?? ""}`.trim();
    throw new Error(msg);
  }
  if (json.result === undefined) {
    throw new Error("Direct API: пустой ответ");
  }
  return json.result;
}

const PAGE_LIMIT = 10000;

type PageResult<K extends string, T> = Record<K, T[]> & { LimitedBy?: number };

export async function directGetAllPages<K extends string, T>(
  service: DirectService,
  resultKey: K,
  fieldNames: string[],
  accessToken: string,
  extraParams: Record<string, unknown> = {}
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;

  for (;;) {
    const result = await directJsonRpc<PageResult<K, T>>(
      service,
      "get",
      {
        SelectionCriteria: {},
        FieldNames: fieldNames,
        Page: { Limit: PAGE_LIMIT, Offset: offset },
        ...extraParams,
      },
      accessToken
    );

    const batch = result[resultKey] ?? [];
    out.push(...batch);

    const limited = result.LimitedBy;
    if (!limited || batch.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return out;
}
