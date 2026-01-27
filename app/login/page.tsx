"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.855 32.659 29.27 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.877 19.51C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4c-7.682 0-14.354 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.248 0-9.821-3.317-11.29-7.946l-6.52 5.02C9.49 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.703 1.997-1.94 3.692-3.584 4.87l.003-.002 6.19 5.238C36.971 39.305 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.5 7l6.1 5.02c.24.2.56.2.8 0L18.5 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  // Если уже залогинен — сразу уводим в "внутрянку"
  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        router.replace("/demo");
        router.refresh();
      }
    });

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const goAfterLogin = () => {
    router.replace("/demo");
    router.refresh();
  };

  const signInGoogle = async () => {
    setErrorText(null);
    setInfoText(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // дальше будет редирект на Google
    } catch (e: any) {
      setErrorText(e?.message || "Не получилось запустить вход через Google");
      setLoading(false);
    }
  };

  const onPrimary = async () => {
    setErrorText(null);
    setInfoText(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorText("Введите email");
      return;
    }

    setLoading(true);
    try {
      if (mode === "email") {
        const emailRedirectTo = `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo,
          },
        });

        if (error) throw error;

        setMode("code");
        setInfoText("Мы отправили код на почту. Введите его ниже.");
        return;
      }

      const cleanCode = code.trim();
      if (!cleanCode) {
        setErrorText("Введите код из письма");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "email",
      });

      if (error) throw error;

      goAfterLogin();
    } catch (e: any) {
      setErrorText(e?.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-[1200px] justify-center px-6 pt-[110px]">
        <div className="w-full max-w-[520px] text-center">
          {/* ЛОГО */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EDEBFF]" />
            <div className="text-[18px] font-semibold text-[#111827]">КНОПКА.</div>
          </div>

          {/* ЗАГОЛОВОК */}
          <h1 className="mt-10 text-[34px] font-semibold leading-[1.08] text-[#111827]">
            Войдите в свою учетную
            <br />
            запись
          </h1>

          {/* GOOGLE */}
          <button
            type="button"
            onClick={signInGoogle}
            disabled={loading}
            className="mt-10 inline-flex h-[44px] w-full items-center justify-center gap-3 rounded-[10px] border border-black/20 bg-white text-[14px] font-medium text-[#111827] hover:bg-black/[0.02] disabled:opacity-60"
          >
            <GoogleIcon />
            Продолжить с Google
          </button>

          {/* DIVIDER */}
          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-black/15" />
            <div className="text-[13px] text-black/50">Или</div>
            <div className="h-px flex-1 bg-black/15" />
          </div>

          {/* LABEL */}
          <div className="mt-6 text-left text-[13px] font-medium text-[#111827]">
            Введите свой адрес электронной почты
          </div>

          {/* INPUT */}
          <div className="mt-2">
            <div
              className={`flex h-[44px] w-full items-center gap-3 rounded-[10px] border bg-white px-3 ${
                mode === "code"
                  ? "border-black/20"
                  : "border-[#6B5CFF] shadow-[0_0_0_3px_rgba(107,92,255,0.12)]"
              }`}
            >
              <div className="text-black/45">
                <MailIcon />
              </div>

              {mode === "email" ? (
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-full w-full bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-black/35"
                />
              ) : (
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Код из письма"
                  className="h-full w-full bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-black/35"
                />
              )}
            </div>
          </div>

          {/* PRIMARY */}
          <button
            type="button"
            onClick={onPrimary}
            disabled={loading}
            className="mt-4 h-[44px] w-full rounded-[10px] bg-[#6B5CFF] text-[14px] font-semibold text-white hover:bg-[#5E4FFF] disabled:opacity-60"
          >
            {mode === "email" ? "Вход" : "Подтвердить код"}
          </button>

          {/* FOOTER */}
          <div className="mt-5 text-[13px] text-black/70">
            Войдите в систему с помощью единого входа
          </div>

          <div className="mt-6 text-[13px] text-black/70">
            У вас нет аккаунта?{" "}
            <a href="/sign-up" className="font-medium text-[#6B5CFF] hover:underline">
              Зарегистрируйтесь
            </a>
          </div>

          {/* MESSAGES */}
          {(errorText || infoText) && (
            <div className="mt-6 text-left">
              {errorText && (
                <div className="rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {errorText}
                </div>
              )}
              {infoText && (
                <div className="rounded-[10px] bg-black/5 px-4 py-3 text-[13px] text-black/70">
                  {infoText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
