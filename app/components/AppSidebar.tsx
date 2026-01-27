"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Package,
  ClipboardList,
  FileText,
  Database,
  Users,
  Grid3X3,
  Settings,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

type AppSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
}: AppSidebarProps) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { label: "Дашборд", href: "/app/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Каналы", href: "/app/channels", icon: <Megaphone className="h-4 w-4" /> },
    { label: "Продукт и прайс", href: "/app/product", icon: <Package className="h-4 w-4" /> },
    { label: "Планы и инициативы", href: "/app/plans", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Отчёты", href: "/app/reports", icon: <FileText className="h-4 w-4" /> },
    { label: "Данные", href: "/app/data", icon: <Database className="h-4 w-4" /> },
    { label: "Системы и данные", href: "/app/systems", icon: <Database className="h-4 w-4" /> },
    { label: "Специалисты", href: "/app/specialists", icon: <Users className="h-4 w-4" /> },
    { label: "Каталог", href: "/app/catalog", icon: <Grid3X3 className="h-4 w-4" /> },
    { label: "Настройки", href: "/app/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="relative rounded-3xl border border-neutral-200 bg-white p-3 shadow-[0_1px_0_rgba(16,24,40,0.04)]">
      {/* КНОПКА СВОРАЧИВАНИЯ — на границе, не режется */}
      {onToggleCollapsed ? (
        <button
          onClick={onToggleCollapsed}
          className={cn(
            "absolute top-4 -right-4 z-20",
            "inline-flex h-9 w-9 items-center justify-center",
            "rounded-full border border-neutral-200 bg-white",
            "shadow-[0_6px_20px_rgba(16,24,40,0.10)]",
            "hover:bg-neutral-50 transition"
          )}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      ) : null}

      {/* NAV */}
      <nav className="space-y-1">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/app/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors",
                isActive ? "bg-neutral-900 text-white" : "hover:bg-neutral-50 text-neutral-900"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 transition-colors",
                  isActive
                    ? "border-neutral-800 bg-neutral-800 text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-900 group-hover:bg-white"
                )}
              >
                {item.icon}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1 whitespace-nowrap text-sm transition-all duration-200",
                  collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
                )}
              >
                {item.label}
              </span>

              <span
                className={cn(
                  "transition-all duration-200",
                  collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
                )}
              >
                <ChevronRight className={cn("h-4 w-4", isActive ? "text-white/70" : "text-neutral-400")} />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="mt-3 border-t border-neutral-200 pt-3">
        <Link
          href="/app/setup"
          title="Профиль"
          className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-50 transition-colors"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 shrink-0">
            <User className="h-4 w-4" />
          </span>

          <span
            className={cn(
              "min-w-0 flex-1 transition-all duration-200",
              collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
            )}
          >
            <div className="text-sm font-medium">Профиль</div>
            <div className="text-xs text-neutral-500">ЛК КНОПКА</div>
          </span>

          <span
            className={cn(
              "transition-all duration-200",
              collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
            )}
          >
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          </span>
        </Link>
      </div>
    </div>
  );
}
