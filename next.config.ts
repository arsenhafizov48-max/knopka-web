import type { NextConfig } from "next";

/** Прод: NEXT_PUBLIC_BASE_PATH=/knopka → сайт на https://домен/knopka */
const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath =
  raw && raw !== "/"
    ? (raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`)
    : "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
};

export default nextConfig;
