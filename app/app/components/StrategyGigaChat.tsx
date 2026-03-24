"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Maximize2, MessageCircle, Minimize2, Paperclip, Send, X } from "lucide-react";

import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { withBasePath } from "@/app/lib/publicBasePath";
import { loadStrategyThread, saveStrategyThread } from "@/app/app/lib/gigachat/strategyThreadDb";
import type { ProjectFact } from "@/app/app/lib/projectFact";
import { formatProjectFactForAi } from "@/app/app/lib/gigachat/formatProjectFactForAi";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_KNOPKA_DEV_SKIP_AUTH === "1";

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
}: {
  doc: StrategyDocument | null;
  fact: ProjectFact | null;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Без сессии Supabase историю в облако не пишем (имя в шапке ЛК может быть просто заглушкой). */
  const [cloudPersist, setCloudPersist] = useState<
    "checking" | "signed_in" | "need_login" | "dev_skip"
  >(DEV_SKIP_AUTH ? "dev_skip" : "checking");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const strategyContext = useMemo(() => buildStrategyContext(doc), [doc]);
  const cabinetContext = useMemo(() => formatProjectFactForAi(fact), [fact]);

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

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;

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
    setLoading(true);
    try {
      const url = `${window.location.origin}${withBasePath("/api/gigachat/chat")}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(
          rawText.slice(0, 120) || `Сервер вернул не JSON (код ${res.status}). Проверь деплой и /api/gigachat/chat.`
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
      if (!DEV_SKIP_AUTH) {
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
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить";
      setError(msg);
      setTurns((prev) =>
        prev.length > 0 && prev[prev.length - 1]?.role === "user" ? prev.slice(0, -1) : prev
      );
      setPendingFiles(filesSnapshot);
      if (text) setInput(text);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [input, loading, turns, strategyContext, cabinetContext, pendingFiles]);

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
              Стратегия, точка А/Б, каналы. В запрос уходит фактура из ЛК и текст стратегии. Файлы: .txt, .md, .csv. Фото
              пока не в модель.
            </p>
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
          {loading ? (
            <div className="text-center text-xs text-neutral-500">GigaChat печатает…</div>
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
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-40"
            aria-label="Прикрепить файл"
            title="Текстовый файл: .txt, .md, .csv"
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
            disabled={loading}
          />
          <button
            type="button"
            disabled={loading || (!input.trim() && pendingFiles.length === 0)}
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
