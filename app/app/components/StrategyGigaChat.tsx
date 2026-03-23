"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { withBasePath } from "@/app/lib/publicBasePath";
import type { ProjectFact } from "@/app/app/lib/projectFact";
import { formatProjectFactForAi } from "@/app/app/lib/gigachat/formatProjectFactForAi";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";

type ChatTurn = { role: "user" | "assistant"; content: string };

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const strategyContext = useMemo(() => buildStrategyContext(doc), [doc]);
  const cabinetContext = useMemo(() => formatProjectFactForAi(fact), [fact]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(nextTurns);
    setLoading(true);
    try {
      const url = `${window.location.origin}${withBasePath("/api/gigachat/chat")}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
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
      setTurns((t) => [...t, { role: "assistant", content: data.reply! }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить";
      setError(msg);
      setTurns((prev) =>
        prev.length > 0 && prev[prev.length - 1]?.role === "user" ? prev.slice(0, -1) : prev
      );
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [input, loading, turns, strategyContext, cabinetContext]);

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-5 ring-1 ring-emerald-100">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-900">Чат с GigaChat</div>
          <p className="mt-1 text-sm text-neutral-600">
            Спроси про стратегию, точку А/Б, каналы, материалы. В запрос уходит{" "}
            <strong>снимок фактуры из ЛК</strong> (онбординг, фактура, файлы — имена, не содержимое) и,
            если есть, текст сформированной стратегии.
          </p>

          <div className="mt-4 max-h-[min(420px,55vh)] space-y-3 overflow-y-auto rounded-xl border border-emerald-100/80 bg-white/80 p-3">
            {turns.length === 0 ? (
              <p className="text-center text-xs text-neutral-400">Напиши сообщение ниже</p>
            ) : (
              turns.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    t.role === "user"
                      ? "ml-6 bg-neutral-900 text-white"
                      : "mr-6 border border-emerald-100 bg-emerald-50/50 text-neutral-800"
                  }`}
                >
                  {t.content}
                </div>
              ))
            )}
            {loading ? (
              <div className="text-xs text-neutral-500">GigaChat печатает…</div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {error ? (
            <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Например: как усилить блок про каналы?"
              className="min-h-[44px] flex-1 resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
              disabled={loading}
            />
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => void send()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-end rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
