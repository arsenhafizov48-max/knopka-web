"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  Link as LinkIcon,
  Search,
  Users,
} from "lucide-react";

import { loadProjectFact } from "@/app/app/lib/projectFact";

type Fact = ReturnType<typeof loadProjectFact>;

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function money(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function isFilledText(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeUrl(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // если человек вставил @username или t.me/..., не ломаем
  if (s.startsWith("@") || s.includes("t.me/") || s.includes("vk.com/")) return s;
  return s;
}

function MiniCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function EmptyBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{text}</div>
      <div className="mt-4">
        <Link
          href="/app/fact"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Открыть фактуру <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const [fact, setFact] = useState<Fact | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const read = () => setFact(loadProjectFact());

    read();

    const onUpdated = () => read();
    window.addEventListener("knopka:projectFactUpdated", onUpdated);

    return () => window.removeEventListener("knopka:projectFactUpdated", onUpdated);
  }, []);

  const channelBudgets = useMemo(() => {
    const rows = (fact as any)?.channelBudgets ?? [];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r: any) => ({
        id: String(r?.id ?? ""),
        channel: String(r?.channel ?? "").trim(),
        budget: toNumber(r?.budget),
      }))
      .filter((r) => r.channel.length > 0);
  }, [fact]);

  const specialistCosts = useMemo(() => {
    const rows = (fact as any)?.specialistCosts ?? [];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r: any) => ({
        id: String(r?.id ?? ""),
        role: String(r?.role ?? "").trim(),
        cost: toNumber(r?.cost),
      }))
      .filter((r) => r.role.length > 0);
  }, [fact]);

  const platformLinks = useMemo(() => {
    const links = (fact as any)?.platformLinks ?? {};
    return {
      site: String(links?.site ?? "").trim(),
      telegram: String(links?.telegram ?? "").trim(),
      instagram: String(links?.instagram ?? "").trim(),
      vk: String(links?.vk ?? "").trim(),
      yandexMaps: String(links?.yandexMaps ?? links?.yandexBusiness ?? "").trim(),
      avito: String(links?.avito ?? "").trim(),
      marketplaces: String(links?.marketplaces ?? "").trim(),
      other: String(links?.other ?? "").trim(),
    };
  }, [fact]);

  const connected = useMemo(() => {
    const arr = (fact as any)?.channels?.connected ?? [];
    return Array.isArray(arr) ? arr.map((x: any) => String(x)) : [];
  }, [fact]);

  const totals = useMemo(() => {
    const ads = channelBudgets.reduce((s, r) => s + (r.budget || 0), 0);
    const people = specialistCosts.reduce((s, r) => s + (r.cost || 0), 0);
    const all = ads + people;
    return { ads, people, all };
  }, [channelBudgets, specialistCosts]);

  const filteredBudgets = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return channelBudgets;
    return channelBudgets.filter((r) => r.channel.toLowerCase().includes(query));
  }, [channelBudgets, q]);

  const filteredSpecialists = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return specialistCosts;
    return specialistCosts.filter((r) => r.role.toLowerCase().includes(query));
  }, [specialistCosts, q]);

  const linksList = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [
      { label: "Сайт", value: platformLinks.site },
      { label: "Telegram", value: platformLinks.telegram },
      { label: "Instagram", value: platformLinks.instagram },
      { label: "VK", value: platformLinks.vk },
      { label: "Яндекс.Карты / Бизнес", value: platformLinks.yandexMaps },
      { label: "Авито", value: platformLinks.avito },
      { label: "Маркетплейсы", value: platformLinks.marketplaces },
      { label: "Другое", value: platformLinks.other },
    ];
    return items.filter((x) => isFilledText(x.value));
  }, [platformLinks]);

  // чтобы не падало до загрузки
  if (!fact) {
    return <div className="p-6 text-sm text-neutral-600">Загрузка…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-none px-0">
      <div className="mx-auto w-full max-w-[1540px] px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-500">Раздел</div>
            <h1 className="mt-1 text-2xl font-semibold">Каналы</h1>
            <div className="mt-1 text-sm text-neutral-600">
              Здесь собраны бюджеты, специалисты и ссылки на площадки из фактуры.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app/fact"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Редактировать в фактуре <ArrowUpRight className="h-4 w-4 text-neutral-500" />
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <MiniCard
            icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
            label="Бюджеты по каналам"
            value={`${money(totals.ads)} ₽`}
            hint="Сумма по строкам “Каналы и бюджеты”"
          />
          <MiniCard
            icon={<Users className="h-4 w-4 text-neutral-600" />}
            label="Расходы на специалистов"
            value={`${money(totals.people)} ₽`}
            hint="Сумма по строкам “Специалисты”"
          />
          <MiniCard
            icon={<CircleDollarSign className="h-4 w-4 text-neutral-600" />}
            label="Итого в месяц"
            value={`${money(totals.all)} ₽`}
            hint="Каналы + специалисты"
          />
        </div>

        {/* Search + quick info */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Left */}
          <div className="space-y-6">
            {/* Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-neutral-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  placeholder="Поиск по каналам и специалистам…"
                />
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/app/fact"
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Изменить данные <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Channels budgets table */}
            {channelBudgets.length === 0 ? (
              <EmptyBlock
                title="Каналы и бюджеты не заполнены"
                text="Добавь строки в фактуре: какие каналы используете и сколько тратите в месяц."
              />
            ) : (
              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="flex items-center justify-between gap-3 bg-neutral-50 px-4 py-3">
                  <div className="text-sm font-semibold">Каналы и бюджеты</div>
                  <div className="text-xs text-neutral-600">
                    Строк: {filteredBudgets.length}
                  </div>
                </div>

                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] gap-3 bg-white px-4 py-3 text-xs font-medium text-neutral-600">
                  <div>Канал</div>
                  <div>Бюджет (₽/мес)</div>
                  <div className="text-right">Доля</div>
                </div>

                <div className="divide-y divide-neutral-200">
                  {filteredBudgets.map((r) => {
                    const share = totals.ads > 0 ? Math.round((r.budget / totals.ads) * 100) : 0;
                    return (
                      <div
                        key={r.id}
                        className="grid grid-cols-[1.2fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-sm"
                      >
                        <div className="text-neutral-900">{r.channel}</div>
                        <div className="text-neutral-900">{money(r.budget)} ₽</div>
                        <div className="text-right text-neutral-700">{share}%</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Specialists table */}
            {specialistCosts.length === 0 ? (
              <EmptyBlock
                title="Специалисты не заполнены"
                text="Добавь специалистов в фактуре: кто ведёт маркетинг и сколько стоит в месяц."
              />
            ) : (
              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="flex items-center justify-between gap-3 bg-neutral-50 px-4 py-3">
                  <div className="text-sm font-semibold">Специалисты</div>
                  <div className="text-xs text-neutral-600">
                    Строк: {filteredSpecialists.length}
                  </div>
                </div>

                <div className="grid grid-cols-[1.2fr_0.7fr] gap-3 bg-white px-4 py-3 text-xs font-medium text-neutral-600">
                  <div>Роль</div>
                  <div>Стоимость (₽/мес)</div>
                </div>

                <div className="divide-y divide-neutral-200">
                  {filteredSpecialists.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[1.2fr_0.7fr] gap-3 px-4 py-3 text-sm"
                    >
                      <div className="text-neutral-900">{r.role}</div>
                      <div className="text-neutral-900">{money(r.cost)} ₽</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Connected */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="text-sm font-semibold">Что уже есть</div>

              {connected.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">
                  Пока ничего не отмечено. Заполни на шаге 2 или в фактуре.
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {connected.map((x) => (
                    <span
                      key={x}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800"
                    >
                      {x}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Link
                  href="/app/fact"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Изменить в фактуре <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            {/* Links */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-neutral-600" />
                <div className="text-sm font-semibold">Ссылки на площадки</div>
              </div>

              {linksList.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">
                  Ссылки не заполнены. Добавь в фактуре или на шаге 2.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {linksList.map((x) => {
                    const v = normalizeUrl(x.value);
                    const isHttp = v.startsWith("http://") || v.startsWith("https://");
                    return (
                      <div
                        key={x.label}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2"
                      >
                        <div className="text-xs text-neutral-500">{x.label}</div>
                        <div className="mt-1 break-all text-sm text-neutral-900">
                          {isHttp ? (
                            <a
                              href={v}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              {v} <ArrowUpRight className="h-4 w-4" />
                            </a>
                          ) : (
                            <span>{v}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <Link
                  href="/app/fact"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Редактировать ссылки <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
