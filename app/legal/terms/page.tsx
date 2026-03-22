import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Пользовательское соглашение — КНОПКА",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 text-neutral-800">
      <div className="mx-auto max-w-2xl text-sm leading-relaxed">
        <Link href="/" className="text-[#6B5CFF] hover:underline">
          ← На главную
        </Link>
        <h1 className="mt-8 text-2xl font-semibold text-neutral-900">
          Пользовательское соглашение
        </h1>
        <p className="mt-4 text-neutral-600">
          Здесь будет полный текст пользовательского соглашения сервиса «КНОПКА».
          Замените на финальную редакцию.
        </p>
      </div>
    </div>
  );
}
