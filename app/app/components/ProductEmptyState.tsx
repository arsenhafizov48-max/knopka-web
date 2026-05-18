import Link from "next/link";
import type { ReactNode } from "react";

import { withBasePath } from "@/app/lib/publicBasePath";

export function ProductEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#12192B]/90 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
      {icon ? <div className="flex justify-center">{icon}</div> : null}
      <h1 className="mt-4 text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      <Link
        href={withBasePath(actionHref)}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
