// app/components/BrandIcon.tsx
import * as SimpleIcons from "simple-icons";

type SimpleIcon = {
  title: string;
  svg: string;
};

type Props = {
  slug: string;          // например: "yandex" | "googleanalytics" | "googlesearchconsole"
  className?: string;    // размер, например "h-5 w-5"
  color?: string;        // цвет иконки "#2563eb"
  fallbackText?: string; // если иконки нет — показываем букву
};

export default function BrandIcon({
  slug,
  className = "h-5 w-5",
  color = "#111827",
  fallbackText,
}: Props) {
  // В разных версиях simple-icons icons лежит по-разному — забираем безопасно
  const lib = SimpleIcons as unknown as {
    icons?: Record<string, SimpleIcon>;
    default?: { icons?: Record<string, SimpleIcon> };
  };

  const icons = lib.icons ?? lib.default?.icons ?? {};
  const icon = icons[slug];

  if (!icon?.svg) {
    const t = fallbackText ?? slug?.[0]?.toUpperCase() ?? "?";
    return (
      <span
        className={`grid place-items-center rounded-md bg-neutral-100 text-[10px] font-semibold text-neutral-700 ${className}`}
        title={slug}
      >
        {t}
      </span>
    );
  }

  // Добавляем class + цвет в svg
  const svg = icon.svg.replace(
    "<svg",
    `<svg class="${className}" style="color:${color};"`
  );

  return (
    <span
      aria-label={icon.title}
      title={icon.title}
      className="inline-flex items-center justify-center"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
