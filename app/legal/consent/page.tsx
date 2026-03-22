import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — КНОПКА",
  robots: { index: true, follow: true },
};

export default function ConsentPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 text-neutral-800">
      <div className="mx-auto max-w-2xl text-sm leading-relaxed">
        <Link href="/" className="text-[#6B5CFF] hover:underline">
          ← На главную
        </Link>
        <h1 className="mt-8 text-2xl font-semibold text-neutral-900">
          Согласие на обработку персональных данных
        </h1>
        <p className="mt-4 text-neutral-600">
          Здесь будет текст согласия субъекта персональных данных на обработку
          персональных данных в сервисе «КНОПКА». Замените на утверждённую
          юристом версию.
        </p>
      </div>
    </div>
  );
}
