"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { withBasePath } from "@/app/lib/publicBasePath";
import { getCabinetEntryPath } from "@/app/app/lib/projectFact";
import { GoogleBrandIcon, VkBrandIcon, YandexBrandIcon } from "@/app/components/auth/BrandIcons";
import {
  getTurnstileSiteKey,
  isTurnstileConfigured,
  verifyTurnstileToken,
} from "@/app/lib/turnstileClient";

const LoginTurnstile = dynamic(() => import("@/app/components/auth/LoginTurnstile"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-500">
      Загрузка проверки…
    </div>
  ),
});

type OauthId = "google" | "yandex" | "vk";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const captchaRequired = isTurnstileConfigured();
  const turnstileSiteKey = getTurnstileSiteKey();

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        router.replace(getCabinetEntryPath());
        router.refresh();
      }
    });
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const verifyCaptcha = useCallback(async (): Promise<boolean> => {
    const r = await verifyTurnstileToken(captchaToken);
    if (r.ok) return true;
    setErrorText(r.message);
    setCaptchaToken(null);
    return false;
  }, [captchaToken]);

  const signInOAuth = async (provider: OauthId) => {
    setErrorText(null);
    setInfoText(null);
    if (!(await verifyCaptcha())) return;

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}${withBasePath("/auth/callback")}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as "google",
        options: {
          redirectTo,
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });
      if (error) throw error;
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const hint =
        raw.toLowerCase().includes("provider") || raw.toLowerCase().includes("not enabled")
          ? " Включите провайдер в Supabase: Authentication → Providers."
          : "";
      setErrorText((e instanceof Error ? e.message : "Не удалось продолжить через соцсеть") + hint);
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setInfoText(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorText("Введите почту");
      return;
    }
    if (!password) {
      setErrorText("Введите пароль");
      return;
    }

    if (!(await verifyCaptcha())) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      router.replace(getCabinetEntryPath());
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось войти";
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-100 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDEBFF] text-sm font-bold text-[#2B2B2B]">
            K
          </span>
          КНОПКА.
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-6 pb-16 pt-10 sm:pt-14">
        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-[28px]">
          Вход в КНОПКА
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => signInOAuth("google")}
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            aria-label="Вход через Google"
          >
            <GoogleBrandIcon className="h-5 w-5" />
            Google
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => signInOAuth("yandex")}
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            aria-label="Вход через Яндекс"
          >
            <YandexBrandIcon className="h-5 w-5" />
            Яндекс
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => signInOAuth("vk")}
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            aria-label="Вход через VK ID"
          >
            <VkBrandIcon className="h-5 w-5" />
            VK ID
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => document.getElementById("knopka-login-email")?.focus()}
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            aria-label="Вход по почте"
          >
            <Mail className="h-5 w-5 text-neutral-500" />
            По почте
          </button>
        </div>

        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-500">или почта</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="knopka-login-email" className="text-sm font-medium text-neutral-800">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="knopka-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@company.com"
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#6B5CFF] focus:ring-2 focus:ring-[#6B5CFF]/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="knopka-login-password" className="text-sm font-medium text-neutral-800">
                Пароль <span className="text-red-600">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#5E4FFF] hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <input
                id="knopka-login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Введите пароль"
                className="h-11 w-full rounded-xl border border-neutral-200 pr-11 pl-3 text-sm outline-none transition focus:border-[#6B5CFF] focus:ring-2 focus:ring-[#6B5CFF]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {captchaRequired ? (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
              <LoginTurnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} />
            </div>
          ) : process.env.NODE_ENV === "development" ? (
            <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-900">
              <strong>Только для разработки:</strong> капча не подключена. Для боя — ключи в{" "}
              <code className="rounded bg-white px-1">.env.local</code>, см. <code className="rounded bg-white px-1">.env.example</code>.
            </p>
          ) : null}

          {errorText ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{errorText}</div>
          ) : null}
          {infoText ? (
            <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-800">{infoText}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="font-medium text-[#5E4FFF] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </main>
    </div>
  );
}
