import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "КНОПКА",
  description: "КНОПКА — система маркетинга и продаж",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
