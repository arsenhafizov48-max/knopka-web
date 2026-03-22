import type { SimpleIcon } from "simple-icons";
import { siGoogle, siVk } from "simple-icons";

function SvgBrand({ icon, className }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" aria-hidden className={className} fill={`#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}

export function GoogleBrandIcon({ className }: { className?: string }) {
  return <SvgBrand icon={siGoogle} className={className} />;
}

export function VkBrandIcon({ className }: { className?: string }) {
  return <SvgBrand icon={siVk} className={className} />;
}

/** Логотип Яндекса (упрощённо, т.к. в simple-icons нет отдельного siYandex) */
export function YandexBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#FC3F1D" />
      <path
        fill="#fff"
        d="M13.2 6.5h-2.1c-1.9 0-3.1 1-3.1 2.9 0 1.4.7 2.3 1.8 2.8L6.8 17.5h2.5l2.5-4.7h1v4.7h2.1V6.5zm-1.9 5.1c-.9 0-1.4-.5-1.4-1.4 0-.9.5-1.4 1.5-1.4h.8v2.8h-.9z"
      />
    </svg>
  );
}
