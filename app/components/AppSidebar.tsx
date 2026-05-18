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
  Target,
  History,
} from "lucide-react";
import SidebarSignOut from "@/app/components/SidebarSignOut";
import { withBasePath } from "@/app/lib/publicBasePath";

type AppSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
}: AppSidebarProps) {
  const pathname = usePathname() ?? "";

  const nav: NavItem[] = [
    { label: "Дашборд", href: "/app/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Стратегия", href: "/app/strategy", icon: <Target className="h-4 w-4" /> },
    {
      label: "История анализов",
      href: "/app/strategy/history",
      icon: <History className="h-4 w-4" />,
    },
    { label: "Каналы", href: "/app/channels", icon: <Megaphone className="h-4 w-4" /> },
    { label: "Продукт и прайс", href: "/app/product", icon: <Package className="h-4 w-4" /> },
    { label: "Планы и инициативы", href: "/app/plans", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Отчёты", href: "/app/reports", icon: <FileText className="h-4 w-4" /> },
    {
      label: "Системы и данные",
      href: "/app/systems",
      icon: <Database className="h-4 w-4" />,
      match: (p) => p.startsWith("/app/systems") || p.startsWith("/app/data"),
    },
    { label: "Специалисты", href: "/app/specialists", icon: <Users className="h-4 w-4" /> },
    { label: "Каталог", href: "/app/catalog", icon: <Grid3X3 className="h-4 w-4" /> },
    { label: "Настройки", href: "/app/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0f1528]/95 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      {onToggleCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "absolute top-4 right-2 z-20",
            "inline-flex h-9 w-9 items-center justify-center",
            "rounded-full border border-white/15 bg-[#12192B] text-slate-200",
            "shadow-lg hover:bg-[#1a2540] transition"
          )}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      ) : null}

      <nav className="space-y-1">
        {nav.map((item) => {
          let isActive =
            item.match?.(pathname) ??
            (pathname === item.href ||
              (item.href !== "/app/dashboard" && pathname.startsWith(item.href)));
          if (item.href === "/app/strategy" && pathname.startsWith("/app/strategy/history")) {
            isActive = false;
          }

          return (
            <Link
              key={item.href}
              href={withBasePath(item.href)}
              title={item.label}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                isActive
                  ? "bg-gradient-to-r from-blue-600/90 to-violet-600/80 text-white shadow-md shadow-blue-900/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  isActive
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-slate-400 group-hover:text-slate-200"
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

              {!collapsed ? (
                <ChevronRight className={cn("h-4 w-4 shrink-0", isActive ? "text-white/70" : "text-slate-600")} />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-white/10 pt-3">
        <Link
          href={withBasePath("/app/setup")}
          title="Профиль"
          className="flex items-center gap-3 rounded-xl px-2 py-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <User className="h-4 w-4" />
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <ProfileLabel />
            </span>
          ) : null}
        </Link>
        <div className="mt-1">
          <SidebarSignOut collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}

function ProfileLabel() {
  return (
    <>
      <div className="text-sm font-medium text-slate-200">Профиль</div>
      <div className="text-xs text-slate-500">ЛК КНОПКА</div>
    </>
  );
}
