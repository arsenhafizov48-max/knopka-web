import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "КНОПКА",
  description: "КНОПКА — система маркетинга и продаж",
};

/** Должен совпадать с next.config basePath (тот же NEXT_PUBLIC_BASE_PATH). */
function basePathForClientScript(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bp = basePathForClientScript();
  /** null = «в билде нет префикса», клиент тогда берёт basePath из URL; строка = точный префикс с сервера */
  const basePathLiteral = bp === "" ? "null" : JSON.stringify(bp);
  return (
    <html lang="ru">
      <body>
        {/* Синхронно до гидрации: fetch к /api не промахивается мимо basePath */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__KNOPKA_BASE_PATH__=${basePathLiteral};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
