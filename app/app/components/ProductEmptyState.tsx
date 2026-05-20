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
    <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-[0_1px_0_rgba(16,24,40,0.04)]">
      {icon ? <div className="flex justify-center">{icon}</div> : null}
      <h1 className="mt-4 text-xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
      <Link
        href={withBasePath(actionHref)}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
