"use client";

import { useState } from "react";

import { withBasePath } from "@/app/lib/publicBasePath";

type UserInfoPayload = {
  userInfo?: {
    login: string;
    limitPerSecond: number;
    dailyLimit: number;
    dailyLimitRemaining: number;
  };
  error?: string;
};

export default function WordstatHealthCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UserInfoPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const url = `${window.location.origin}${withBasePath("/api/wordstat")}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "userInfo" }),
      });
      const data = (await res.json()) as UserInfoPayload;
      if (!res.ok) {
        if (res.status === 401) {
          setErr("Нужно войти в аккаунт — обновите страницу и авторизуйтесь.");
        } else {
          setErr(data.error || `Ошибка ${res.status}`);
        }
        return;
      }
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  };

  const u = result?.userInfo;

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm ring-1 ring-neutral-200/40">
      <h2 className="text-sm font-semibold text-neutral-900">Яндекс Вордстат</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Проверка, что на сервере настроен доступ к API Вордстата (квота и логин Яндекса).
      </p>
      <button
        type="button"
        onClick={() => void check()}
        disabled={loading}
        className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50"
      >
        {loading ? "Проверяем…" : "Проверить подключение"}
      </button>
      {err ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
      ) : null}
      {u ? (
        <div className="mt-3 space-y-1 rounded-xl bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
          <p>
            <span className="font-medium">Статус:</span> подключение работает
          </p>
          <p>
            <span className="font-medium">Аккаунт Яндекса:</span> {u.login}
          </p>
          <p>
            <span className="font-medium">Лимит в сутки:</span> {u.dailyLimit} запросов, осталось сегодня:{" "}
            <strong>{u.dailyLimitRemaining}</strong>
          </p>
          <p>
            <span className="font-medium">До сервиса:</span> до {u.limitPerSecond} запросов/сек
          </p>
        </div>
      ) : null}
    </section>
  );
}
