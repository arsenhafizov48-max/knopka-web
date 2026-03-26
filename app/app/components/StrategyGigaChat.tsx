"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Loader2, Maximize2, MessageCircle, Minimize2, Paperclip, Send, X } from "lucide-react";

import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { withBasePath, resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";
import { loadStrategyThread, saveStrategyThread } from "@/app/app/lib/gigachat/strategyThreadDb";
import type { ProjectFact } from "@/app/app/lib/projectFact";
import { formatProjectFactForAi } from "@/app/app/lib/gigachat/formatProjectFactForAi";
import { applyCompetitorsToStrategy } from "@/app/app/lib/strategy/applyCompetitorsToStrategy";
import { applyWordstatDemandSection } from "@/app/app/lib/strategy/applyWordstatDemand";
import { buildStrategyDocument } from "@/app/app/lib/strategy/buildFromFact";
import type { CompetitorAnalysisPayload } from "@/app/app/lib/strategy/competitorTypes";
import { saveStrategy } from "@/app/app/lib/strategy/storage";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";

/** Пока ждём ответ API — смена подписей, чтобы было видно прогресс (как этапы в Cursor). */
const GIGACHAT_PROGRESS_STEPS = [
  "Собираю фактуру бизнеса из кабинета…",
  "Подключаю текст стратегии (включая блок «Рынок», если вы уже запускали Вордстат)…",
  "Отправляю запрос в GigaChat…",
  "Жду ответ модели…",
] as const;

const STRATEGY_JOB_STEPS = [
  "Подтягиваю сводку интеграций (Метрика/Директ)…",
  "Собираю документ стратегии из фактуры…",
  "Сохраняю в браузер…",
] as const;

const WORDSTAT_JOB_STEPS = [
  "Подбираю фразы и регион Вордстата…",
  "Запрашиваю Яндекс.Вордстат…",
  "Считаю спрос и второй проход GigaChat…",
  "Записываю раздел «3. Анализ спроса»…",
] as const;

const COMPETITOR_JOB_STEPS = [
  "Читаю фактуру бизнеса (ниша, гео, услуги)…",
  "Собираю промпт для GigaChat (сайты, карты)…",
  "Отправляю запрос на сервер…",
  "Жду ответ модели (таблицы «Сайты», «Яндекс.Карты», «2ГИС»)…",
] as const;

type StrategyJobKind = "strategy" | "wordstat" | "competitor";

const FETCH_TIMEOUT_MS = 120_000;

type ChatTurn = { role: "user" | "assistant"; content: string };

type PendingFile = { id: string; name: string; text: string };

const MD_WRAP =
  "text-[13px] leading-relaxed text-neutral-800 " +
  "[&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-neutral-900 [&_h1]:first:mt-0 " +
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 " +
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900 " +
  "[&_p]:mb-2 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 " +
  "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5 " +
  "[&_li]:pl-0.5 " +
  "[&_strong]:font-semibold [&_strong]:text-neutral-900 " +
  "[&_a]:text-[#5E4FFF] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#6B5CFF] " +
  "[&_code]:rounded [&_code]:bg-neutral-200/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] " +
  "[&_pre]:mb-2 [&_pre]:mt-1 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_pre]:text-xs " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#6B5CFF]/35 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600 " +
  "[&_table]:mb-2 [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:text-xs " +
  "[&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-neutral-200 [&_td]:px-2 [&_td]:py-1.5 " +
  "[&_hr]:my-3 [&_hr]:border-neutral-200";

function buildStrategyContext(doc: StrategyDocument | null): string {
  if (!doc) return "";
  const lines: string[] = [];
  for (const sec of doc.sections) {
    lines.push(`## ${sec.title}`);
    for (const p of sec.paragraphs) lines.push(p);
    if (sec.bullets?.length) {
      for (const b of sec.bullets) lines.push(`- ${b}`);
    }
  }
  return lines.join("\n").slice(0, 20_000);
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[min(100%,26rem)] rounded-2xl rounded-br-md bg-neutral-800 px-3.5 py-2.5 text-sm leading-relaxed text-white">
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex w-full min-w-0 justify-start">
      <div className="w-full min-w-0 rounded-2xl rounded-bl-md border border-neutral-200/90 bg-white px-4 py-3 shadow-sm">
        <div className={MD_WRAP}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function StrategyGigaChat({
  doc,
  fact,
  setDoc,
  gapsOk,
}: {
  doc: StrategyDocument | null;
  fact: ProjectFact | null;
  setDoc: (d: StrategyDocument) => void;
  gapsOk: boolean;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [jobBusy, setJobBusy] = useState<StrategyJobKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progressPhase, setProgressPhase] = useState(0);
  /** Без сессии Supabase историю в облако не пишем (имя в шапке ЛК может быть просто заглушкой). */
  const [cloudPersist, setCloudPersist] = useState<
    "checking" | "signed_in" | "need_login" | "dev_skip"
  >(DEV_SKIP_AUTH ? "dev_skip" : "checking");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeProgressSteps = useMemo(() => {
    if (chatLoading) return GIGACHAT_PROGRESS_STEPS;
    if (jobBusy === "strategy") return STRATEGY_JOB_STEPS;
    if (jobBusy === "wordstat") return WORDSTAT_JOB_STEPS;
    if (jobBusy === "competitor") return COMPETITOR_JOB_STEPS;
    return [] as readonly string[];
  }, [chatLoading, jobBusy]);

  const progressTitle = chatLoading
    ? "Идёт ответ GigaChat…"
    : jobBusy === "strategy"
      ? "Собираю стратегию из фактуры…"
      : jobBusy === "wordstat"
        ? "Анализ спроса (Вордстат)…"
        : jobBusy === "competitor"
          ? "Анализ конкурентов…"
          : "";

  const busy = chatLoading || jobBusy !== null;

  useEffect(() => {
    if (!chatLoading && !jobBusy) {
      setProgressPhase(0);
      return;
    }
    setProgressPhase(0);
    const id = window.setInterval(() => {
      setProgressPhase((p) => (p < activeProgressSteps.length - 1 ? p + 1 : p));
    }, 850);
    return () => window.clearInterval(id);
  }, [chatLoading, jobBusy, activeProgressSteps.length]);

  useEffect(() => {
    if (DEV_SKIP_AUTH) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setCloudPersist("need_login");
          return;
        }
        setCloudPersist("signed_in");
        try {
          const msgs = await loadStrategyThread(supabase, user.id);
          if (cancelled || msgs.length === 0) return;
          setTurns(msgs.map(({ role, content }) => ({ role, content })));
        } catch (e) {
          console.warn("[КНОПКА] История чата стратегии не загружена (таблица gigachat_strategy_thread или сеть):", e);
        }
      } catch (e) {
        console.warn("[КНОПКА] Supabase недоступен или не настроен:", e);
        if (!cancelled) setCloudPersist("need_login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const [integrationsBlock, setIntegrationsBlock] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(resolveSameOriginApiUrl("/api/integrations/summary"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as { blockForAi?: string };
        if (!alive) return;
        setIntegrationsBlock(typeof j.blockForAi === "string" ? j.blockForAi : "");
      })
      .catch(() => {
        if (alive) setIntegrationsBlock("");
      });
    return () => {
      alive = false;
    };
  }, []);

  const strategyContext = useMemo(() => buildStrategyContext(doc), [doc]);
  const cabinetContext = useMemo(() => {
    const base = formatProjectFactForAi(fact);
    if (!integrationsBlock.trim()) return base;
    return `${base}\n\n--- Подключённые интеграции (сервер) ---\n${integrationsBlock.trim()}`;
  }, [fact, integrationsBlock]);

  const onPickFiles = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (file.type.startsWith("image/")) {
        setError(
          "Фото в модель пока не передаются: GigaChat в этом проекте принимает только текст. Опиши изображение словами или приложи .txt / .md."
        );
        continue;
      }
      const okMime =
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        file.type === "text/csv" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv");
      if (!okMime) {
        setError(`«${file.name}» — поддерживаются .txt, .md, .csv (текст).`);
        continue;
      }
      if (file.size > 48 * 1024) {
        setError(`«${file.name}» больше 48 КБ — сократи или разбей.`);
        continue;
      }
      try {
        const text = (await file.text()).slice(0, 12_000);
        next.push({ id: `${Date.now()}-${file.name}`, name: file.name, text });
      } catch {
        setError(`Не удалось прочитать «${file.name}».`);
      }
    }
    if (next.length) {
      setPendingFiles((p) => [...p, ...next]);
    }
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const removePending = useCallback((id: string) => {
    setPendingFiles((p) => p.filter((x) => x.id !== id));
  }, []);

  const runStrategyJob = useCallback(async () => {
    if (!fact || !gapsOk || chatLoading || jobBusy) return;
    setJobBusy("strategy");
    setError(null);
    try {
      const integrationsRes = await fetch(resolveSameOriginApiUrl("/api/integrations/summary"), {
        credentials: "same-origin",
      });
      const j = (await integrationsRes.json()) as { blockForAi?: string };
      const integrationsBlock = typeof j.blockForAi === "string" ? j.blockForAi : "";
      const next = buildStrategyDocument(fact, { integrationsBlock });
      saveStrategy(next);
      setDoc(next);
      window.dispatchEvent(new Event("knopka:strategyUpdated"));
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content:
            "## Стратегия обновлена\n\nДокумент пересобран из фактуры и сводки интеграций. Разделы ниже на странице — откройте и при необходимости скачайте PDF.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сборки стратегии");
    } finally {
      setJobBusy(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [fact, gapsOk, chatLoading, jobBusy, setDoc]);

  const runWordstatJob = useCallback(async () => {
    if (!fact || !gapsOk || chatLoading || jobBusy) return;
    setJobBusy("wordstat");
    setError(null);
    try {
      const apiUrl = resolveSameOriginApiUrl("/api/strategy/wordstat-demand");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact }),
        credentials: "same-origin",
      });
      const rawText = await res.text();
      let data: {
        error?: string;
        market?: {
          paragraphs: string[];
          bullets: string[];
          tables?: { title: string; columns: string[]; rows: string[][] }[];
        };
        regionLabel?: string;
        phrases?: { requested: number };
        estimate?: { potentialRevenueRub: number | null };
      };
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        const isHtml =
          rawText.trimStart().startsWith("<!") || rawText.trimStart().toLowerCase().startsWith("<html");
        if (res.status === 502 || res.status === 504) {
          setError(
            `Сервер не успел завершить запрос (код ${res.status}). Анализ спроса тяжёлый: Вордстат + два вызова GigaChat. Повторите запрос через минуту.`
          );
        } else if (isHtml) {
          setError(
            `Ответ не JSON (код ${res.status}), запрос: ${apiUrl}. Если сайт с префиксом пути — задайте NEXT_PUBLIC_BASE_PATH.`
          );
        } else {
          setError(rawText.slice(0, 220));
        }
        return;
      }
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      if (!data.market?.paragraphs?.length) {
        setError("Пустой ответ сервера");
        return;
      }
      const base = doc ?? buildStrategyDocument(fact);
      const next = applyWordstatDemandSection(base, {
        paragraphs: data.market.paragraphs,
        bullets: data.market.bullets ?? [],
        tables: data.market.tables,
      });
      saveStrategy(next);
      setDoc(next);
      window.dispatchEvent(new Event("knopka:strategyUpdated"));
      const rev =
        data.estimate?.potentialRevenueRub != null
          ? ` Оценка выручки/мес: ${new Intl.NumberFormat("ru-RU").format(data.estimate.potentialRevenueRub)} ₽.`
          : "";
      const detail = `${data.regionLabel ?? "гео"}, ${data.phrases?.requested ?? "—"} фраз в одном запросе Вордстата.${rev}`;
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: `## Готово: анализ спроса\n\nРаздел **«3. Анализ спроса»** обновлён данными Вордстата.\n\n${detail}`,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось связаться с сервером");
    } finally {
      setJobBusy(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [fact, gapsOk, chatLoading, jobBusy, doc, setDoc]);

  const runCompetitorJob = useCallback(async () => {
    if (!fact || !gapsOk || chatLoading || jobBusy) return;
    setJobBusy("competitor");
    setError(null);
    try {
      const apiUrl = resolveSameOriginApiUrl("/api/strategy/competitor-analyze");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact }),
        credentials: "same-origin",
      });
      const rawText = await res.text();
      let json: {
        error?: string;
        warning?: string;
        persisted?: boolean;
        sites?: CompetitorAnalysisPayload["sites"];
        yandexMaps?: CompetitorAnalysisPayload["yandexMaps"];
        gis2?: CompetitorAnalysisPayload["gis2"];
      };
      try {
        json = JSON.parse(rawText) as typeof json;
      } catch {
        setError(rawText.slice(0, 240));
        return;
      }
      if (!res.ok) {
        setError(json.error || `Ошибка ${res.status}`);
        return;
      }
      if (!json.sites?.length && !json.yandexMaps?.length && !json.gis2?.length) {
        setError("Пустой ответ модели");
        return;
      }
      const payload: CompetitorAnalysisPayload = {
        sites: json.sites ?? [],
        yandexMaps: json.yandexMaps ?? [],
        gis2: json.gis2 ?? [],
      };
      const base = doc ?? buildStrategyDocument(fact);
      const next = applyCompetitorsToStrategy(base, payload);
      saveStrategy(next);
      setDoc(next);
      window.dispatchEvent(new Event("knopka:strategyUpdated"));
      let msg =
        "## Готово: анализ конкурентов\n\nРаздел **«4. Анализ конкурентов»** обновлён таблицами «Сайты», «Яндекс.Карты», «2ГИС».";
      if (json.persisted === false && json.warning) {
        msg += `\n\n> ${json.warning}`;
      } else {
        msg += "\n\nЗапуск сохранён в истории анализов (если таблица в Supabase создана).";
      }
      setTurns((t) => [...t, { role: "assistant", content: msg }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка анализа конкурентов");
    } finally {
      setJobBusy(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [fact, gapsOk, chatLoading, jobBusy, doc, setDoc]);

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || chatLoading || jobBusy) return;

    const filesSnapshot = pendingFiles;

    const attachBlock =
      filesSnapshot.length > 0
        ? filesSnapshot
            .map((f) => `### Вложение: ${f.name}\n\n${f.text}`)
            .join("\n\n---\n\n")
        : "";
    const composed =
      attachBlock && text
        ? `${attachBlock}\n\n---\n\n**Вопрос:**\n\n${text}`
        : attachBlock && !text
          ? `${attachBlock}\n\n---\n\nПроанализируй вложение в контексте стратегии и фактуры.`
          : text;

    setInput("");
    setPendingFiles([]);
    setError(null);
    const displayUser =
      filesSnapshot.length > 0
        ? [filesSnapshot.map((f) => `📎 ${f.name}`).join("\n"), text].filter(Boolean).join("\n\n")
        : text;

    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: displayUser }];
    setTurns(nextTurns);
    setChatLoading(true);
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/gigachat/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          text: composed,
          strategyContext: strategyContext || undefined,
          cabinetContext: cabinetContext || undefined,
          history: turns,
        }),
      });
      const rawText = await res.text();
      let data: { reply?: string; error?: string };
      try {
        data = JSON.parse(rawText) as { reply?: string; error?: string };
      } catch {
        const html = rawText.trimStart().startsWith("<!") || rawText.trimStart().startsWith("<html");
        throw new Error(
          html
            ? `Сервер вернул HTML вместо JSON (${res.status}). Часто неверный URL API при basePath — проверьте NEXT_PUBLIC_BASE_PATH.`
            : rawText.slice(0, 120) || `Сервер вернул не JSON (код ${res.status}).`
        );
      }
      if (!res.ok) {
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      if (!data.reply) {
        throw new Error("Пустой ответ");
      }
      const finalTurns: ChatTurn[] = [...nextTurns, { role: "assistant", content: data.reply! }];
      setTurns(finalTurns);
      /* Важно: не ждём Supabase здесь — иначе при подвисшем upsert «loading» не сбросится и чат «замрёт». */
      if (!DEV_SKIP_AUTH) {
        void (async () => {
          try {
            const supabase = getSupabaseBrowserClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await saveStrategyThread(supabase, user.id, finalTurns);
            }
          } catch (persistErr) {
            console.warn("[КНОПКА] Не удалось сохранить историю чата:", persistErr);
          }
        })();
      }
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : "Не удалось отправить";
      if (e instanceof DOMException && e.name === "AbortError") {
        msg = `Превышено время ожидания (${Math.round(FETCH_TIMEOUT_MS / 1000)} с). Попробуйте короче сообщение или повторите позже.`;
      } else if (msg === "Failed to fetch" || /networkerror|load failed/i.test(msg)) {
        msg =
          "Нет ответа от сервера (сеть, VPN, блокировка или неверный адрес API). Проверьте подключение; на проде — переменную NEXT_PUBLIC_BASE_PATH, если сайт открывается с префиксом в URL.";
      }
      setError(msg);
      setTurns((prev) =>
        prev.length > 0 && prev[prev.length - 1]?.role === "user" ? prev.slice(0, -1) : prev
      );
      setPendingFiles(filesSnapshot);
      if (text) setInput(text);
    } finally {
      window.clearTimeout(abortTimer);
      setChatLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [input, chatLoading, jobBusy, turns, strategyContext, cabinetContext, pendingFiles]);

  const scrollBoxClass = fullscreen
    ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200/80 bg-white px-4 py-4 sm:px-5"
    : "max-h-[min(480px,58vh)] space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200/80 bg-white px-4 py-4 sm:px-5";

  const cardClass = fullscreen
    ? "flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-3 p-3 sm:gap-4 sm:p-5"
    : "rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm ring-1 ring-neutral-200/40";

  const inner = (
    <div className={cardClass}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D3E4FF] text-[#2563EB]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="gigachat-title" className="text-sm font-semibold text-neutral-900">
              Чат с GigaChat
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Сборка стратегии, Вордстат и конкуренты — кнопками ниже (прогресс в этом же окне). Свободные вопросы — в поле ввода;
              в запрос уходят фактура и текст стратегии. Вложения: только{" "}
              <span className="font-medium">.txt, .md, .csv</span> (до 48 КБ). Фото и PDF в модель{" "}
              <span className="font-medium">не передаются</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!gapsOk || !fact || busy}
                onClick={() => void runStrategyJob()}
                className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Собрать стратегию из фактуры
              </button>
              <button
                type="button"
                disabled={!gapsOk || !fact || busy}
                onClick={() => void runWordstatJob()}
                className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Анализ спроса (Вордстат)
              </button>
              <button
                type="button"
                disabled={!gapsOk || !fact || busy}
                onClick={() => void runCompetitorJob()}
                className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Анализ конкурентов
              </button>
              <Link
                href={withBasePath("/app/strategy/history")}
                className="inline-flex items-center self-center text-xs font-medium text-[#5E4FFF] underline underline-offset-2 hover:text-[#6B5CFF]"
              >
                История анализов
              </Link>
            </div>
            {!gapsOk ? (
              <p className="mt-2 text-xs text-amber-900/90">
                Сначала заполните обязательные поля фактуры — кнопки станут активны.
              </p>
            ) : null}
            {cloudPersist === "need_login" ? (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                История чата не сохраняется после обновления страницы, пока ты не{" "}
                <Link href={withBasePath("/login")} className="font-semibold text-[#6B5CFF] underline underline-offset-2">
                  войдёшь в аккаунт
                </Link>
                . Имя в шапке кабинета сейчас только для вида — облако привязано к входу через почту или Google.
              </p>
            ) : null}
            {cloudPersist === "dev_skip" ? (
              <p className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                Режим без авторизации: история чата в Supabase не сохраняется.
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          title={fullscreen ? "Свернуть (Esc)" : "На весь экран"}
          aria-expanded={fullscreen}
          aria-label={fullscreen ? "Свернуть чат" : "Развернуть чат на весь экран"}
        >
          {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      <div className={fullscreen ? "flex min-h-0 min-w-0 flex-1 flex-col gap-3" : "mt-4 w-full min-w-0"}>
        <div className={scrollBoxClass}>
          {turns.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Напиши сообщение ниже</p>
          ) : (
            turns.map((t, i) =>
              t.role === "user" ? (
                <UserBubble key={i} content={t.content} />
              ) : (
                <AssistantBubble key={i} content={t.content} />
              )
            )
          )}
          {busy ? (
            <div className="rounded-2xl border border-[#6B5CFF]/20 bg-[#F4F2FF] px-4 py-3 text-left">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6B5CFF]" aria-hidden />
                {progressTitle}
              </div>
              <ol className="space-y-1.5 text-[11px] leading-snug text-neutral-600">
                {activeProgressSteps.map((label, i) => {
                  const done = i < progressPhase;
                  const current = i === progressPhase;
                  return (
                    <li key={label} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0" aria-hidden>
                        {done ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : current ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B5CFF]" />
                        ) : (
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-300" />
                        )}
                      </span>
                      <span className={current ? "font-medium text-neutral-900" : done ? "text-neutral-500" : "text-neutral-400"}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-[10px] text-neutral-500">
                Пока идёт операция, поле ввода недоступно. Ответ GigaChat в чате — обычно до 1–2 минут; Вордстат и конкуренты могут
                занять дольше.
              </p>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {pendingFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 py-1 pl-3 pr-1 text-xs text-neutral-800"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removePending(f.id)}
                  className="rounded-full p-1 text-neutral-500 hover:bg-neutral-200/80"
                  aria-label="Убрать файл"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
        ) : null}

        <div className="flex shrink-0 items-end gap-2 rounded-3xl border border-neutral-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-[#6B5CFF]/40 focus-within:ring-2 focus-within:ring-[#6B5CFF]/15">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
            multiple
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-40"
            aria-label="Прикрепить файл"
            title=".txt, .md, .csv — не фото и не PDF"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Спросите про стратегию…"
            className="max-h-36 min-h-[44px] w-0 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy || (!input.trim() && pendingFiles.length === 0)}
            onClick={() => void send()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B5CFF] text-white shadow-sm transition hover:bg-[#5E4FFF] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (fullscreen && mounted) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-neutral-200/80 bg-neutral-50/60 py-10 text-center text-sm text-neutral-500">
          Чат открыт на весь экран. Закрой окно или нажми Esc.
        </div>
        {createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-[#F4F7FF]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gigachat-title"
          >
            {inner}
          </div>,
          document.body
        )}
      </>
    );
  }

  return inner;
}
