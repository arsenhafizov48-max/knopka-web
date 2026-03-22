"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";
import { withBasePath } from "@/app/lib/publicBasePath";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    const clean = email.trim();
    if (!clean) {
      setErrorText("Введите почту");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}${withBasePath("/auth/callback")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить письмо";
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-[1200px] justify-center px-6 pt-[110px]">
        <div className="w-full max-w-[520px] text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EDEBFF]" />
            <div className="text-[18px] font-semibold text-[#111827]">КНОПКА.</div>
          </div>

          <h1 className="mt-10 text-[28px] font-semibold leading-tight text-[#111827]">
            Восстановление пароля
          </h1>
          <p className="mt-3 text-left text-[14px] text-black/60">
            Укажите почту, с которой вы регистрировались. Мы отправим ссылку для
            сброса пароля.
          </p>

          {sent ? (
            <div className="mt-8 rounded-[10px] bg-black/5 px-4 py-4 text-left text-[14px] text-black/70">
              Если такой адрес есть в системе, письмо уже отправлено. Проверьте
              входящие и папку «Спам».
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 text-left">
              <label className="text-[13px] font-medium text-[#111827]">Почта</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
                className="mt-2 h-[44px] w-full rounded-[10px] border border-black/20 px-3 text-[14px] outline-none focus:border-[#6B5CFF] focus:shadow-[0_0_0_3px_rgba(107,92,255,0.12)]"
              />
              {errorText ? (
                <div className="mt-4 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {errorText}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 h-[44px] w-full rounded-[10px] bg-[#6B5CFF] text-[14px] font-semibold text-white hover:bg-[#5E4FFF] disabled:opacity-60"
              >
                {loading ? "Отправка…" : "Отправить ссылку"}
              </button>
            </form>
          )}

          <div className="mt-8 text-[13px] text-black/70">
            <Link href="/login" className="font-medium text-[#6B5CFF] hover:underline">
              ← Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
