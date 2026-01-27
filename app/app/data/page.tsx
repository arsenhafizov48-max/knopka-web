"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCustomChannel,
  getDaily,
  hideChannel,
  listChannels,
  listDaily,
  listHiddenChannelIds,
  removeCustomChannel,
  showChannel,
  upsertDaily,
  type ChannelDef,
  type DailyEntryV2,
  type DailyChannelMetrics,
} from "@/app/app/lib/data/storage";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Ввод чисел: понимает "2,5" и "2.5" */
function toNumLoose(raw: any): number {
  const s = String(raw ?? "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function totals(entry: DailyEntryV2 | null) {
  if (!entry) return { spend: 0, revenue: 0, leads: 0 };
  const spend = (entry.channels || []).reduce((a, x) => a + (x.spend || 0), 0);
  const leads = (entry.channels || []).reduce((a, x) => a + (x.leads || 0), 0);
  const revenue = entry.sales?.revenue || 0;
  return { spend, revenue, leads };
}

function ChannelCard({
  ch,
  value,
  onChange,
  onReset,
  onSave,
  onHide,
  onRemove,
}: {
  ch: ChannelDef;
  value: DailyChannelMetrics;
  onChange: (next: DailyChannelMetrics) => void;
  onReset: () => void;
  onSave: () => void;
  onHide?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-neutral-900">{ch.title}</div>

        <div className="flex items-center gap-2">
          {!ch.isCustom && onHide ? (
            <button
              onClick={onHide}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Скрыть
            </button>
          ) : null}

          {ch.isCustom && onRemove ? (
            <button
              onClick={onRemove}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Удалить
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-600">Показы</div>
          <input
            value={value.impressions}
            onChange={(e) => onChange({ ...value, impressions: toNumLoose(e.target.value) })}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
            inputMode="numeric"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-600">Клики</div>
          <input
            value={value.clicks}
            onChange={(e) => onChange({ ...value, clicks: toNumLoose(e.target.value) })}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
            inputMode="numeric"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-600">Расход</div>
          <input
            value={value.spend}
            onChange={(e) => onChange({ ...value, spend: toNumLoose(e.target.value) })}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
            inputMode="numeric"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-600">Заявки</div>
          <input
            value={value.leads}
            onChange={(e) => onChange({ ...value, leads: toNumLoose(e.target.value) })}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onSave}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Отправить
        </button>
        <button
          onClick={onReset}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium hover:bg-neutral-50"
        >
          Сбросить
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [date, setDate] = useState<string>(todayISO());

  const [channels, setChannels] = useState<ChannelDef[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const [entry, setEntry] = useState<DailyEntryV2>({
    date: todayISO(),
    channels: [],
    site: { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 },
    sales: { sql: 0, sales: 0, revenue: 0 },
  });

  const [openSection, setOpenSection] = useState<"channels" | "site" | "sales" | null>("channels");
  const [openChannelId, setOpenChannelId] = useState<string | null>(null);

  const [addMode, setAddMode] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState("");

  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    setChannels(listChannels());
    setHiddenIds(listHiddenChannelIds());
  }, []);

  useEffect(() => {
    const saved = getDaily(date);

    setEntry(
      saved || {
        date,
        channels: [],
        site: { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 },
        sales: { sql: 0, sales: 0, revenue: 0 },
      }
    );

    setOpenChannelId(null);
    setSavedFlag(false);
  }, [date]);

  const visibleChannels = useMemo(
    () => channels.filter((c) => !hiddenIds.includes(c.id)),
    [channels, hiddenIds]
  );

  const hiddenChannels = useMemo(
    () => channels.filter((c) => hiddenIds.includes(c.id)),
    [channels, hiddenIds]
  );

  const lastDays = useMemo(() => listDaily().slice(0, 10), []);

  function getChannelValue(channelId: string): DailyChannelMetrics {
    const found = entry.channels.find((x) => x.channelId === channelId);
    return (
      found || {
        channelId,
        impressions: 0,
        clicks: 0,
        spend: 0,
        leads: 0,
      }
    );
  }

  function setChannelValue(channelId: string, next: DailyChannelMetrics) {
    setEntry((prev) => {
      const rest = prev.channels.filter((x) => x.channelId !== channelId);
      return { ...prev, channels: [next, ...rest] };
    });
  }

  function flashSaved() {
    setSavedFlag(true);
    window.setTimeout(() => setSavedFlag(false), 1600);
  }

  function onSave() {
    upsertDaily(entry);
    flashSaved();
  }

  function onClearAll() {
    setEntry({
      date,
      channels: [],
      site: { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 },
      sales: { sql: 0, sales: 0, revenue: 0 },
    });
    setOpenChannelId(null);
  }

  function onAddChannel() {
    const ch = addCustomChannel(newChannelTitle);
    if (!ch) return;
    setChannels(listChannels());
    setNewChannelTitle("");
    setAddMode(false);
  }

  function onRemoveChannel(id: string) {
    removeCustomChannel(id);
    setChannels(listChannels());
    setEntry((prev) => ({ ...prev, channels: prev.channels.filter((x) => x.channelId !== id) }));
    if (openChannelId === id) setOpenChannelId(null);
  }

  function onHideChannel(id: string) {
    hideChannel(id);
    setHiddenIds(listHiddenChannelIds());
    if (openChannelId === id) setOpenChannelId(null);
  }

  function onShowChannel(id: string) {
    showChannel(id);
    setHiddenIds(listHiddenChannelIds());
  }

  const dayTotals = useMemo(() => totals(entry), [entry]);

  const openChannel = openChannelId
    ? visibleChannels.find((x) => x.id === openChannelId) || null
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Данные</h1>
        <div className="mt-1 text-sm text-neutral-600">Ежедневный ввод показателей для отчётов.</div>
      </div>

      {/* Панель управления */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs">
            <span className="text-neutral-600">Дата</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs outline-none"
            />
          </div>

          <button
            onClick={onSave}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Отправить
          </button>

          <button
            onClick={onClearAll}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium hover:bg-neutral-50"
          >
            Очистить поля
          </button>

          {savedFlag ? (
            <div className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
              Сохранено
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-neutral-600">
            <div>
              Итог дня: <span className="font-medium text-neutral-900">расход {dayTotals.spend} ₽</span>
            </div>
            <div>
              <span className="font-medium text-neutral-900">выручка {dayTotals.revenue} ₽</span>
            </div>
            <div>
              <span className="font-medium text-neutral-900">заявки {dayTotals.leads}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Каналы */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <button
          onClick={() => setOpenSection((v) => (v === "channels" ? null : "channels"))}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="text-sm font-semibold text-neutral-900">Каналы</div>
          <div className="text-xs text-neutral-600">
            {openSection === "channels" ? "Свернуть" : "Раскрыть"}
          </div>
        </button>

        {openSection === "channels" ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {visibleChannels.map((c) => {
                const active = openChannelId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setOpenChannelId((v) => (v === c.id ? null : c.id))}
                    className={
                      active
                        ? "rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                        : "rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                    }
                  >
                    {c.title}
                  </button>
                );
              })}

              {/* Кнопка добавления справа от каналов */}
              <button
                onClick={() => setAddMode((v) => !v)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                Добавить канал
              </button>

              {hiddenChannels.length > 0 ? (
                <div className="ml-2 text-xs text-neutral-600">
                  Скрытые: {hiddenChannels.length}
                </div>
              ) : null}
            </div>

            {/* Мини-ввод появляется только по кнопке */}
            {addMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newChannelTitle}
                  onChange={(e) => setNewChannelTitle(e.target.value)}
                  placeholder="Название канала"
                  className="w-[240px] rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={onAddChannel}
                  className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Добавить
                </button>
                <button
                  onClick={() => {
                    setAddMode(false);
                    setNewChannelTitle("");
                  }}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium hover:bg-neutral-50"
                >
                  Отмена
                </button>
              </div>
            ) : null}

            {/* Скрытые каналы — вернуть */}
            {hiddenChannels.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs text-neutral-600">Скрытые каналы:</div>
                {hiddenChannels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onShowChannel(c.id)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                  >
                    Вернуть: {c.title}
                  </button>
                ))}
              </div>
            ) : null}

            {openChannel ? (
              <ChannelCard
                ch={openChannel}
                value={getChannelValue(openChannel.id)}
                onChange={(next) => setChannelValue(openChannel.id, next)}
                onSave={onSave}
                onReset={() =>
                  setChannelValue(openChannel.id, {
                    channelId: openChannel.id,
                    impressions: 0,
                    clicks: 0,
                    spend: 0,
                    leads: 0,
                  })
                }
                onHide={!openChannel.isCustom ? () => onHideChannel(openChannel.id) : undefined}
                onRemove={openChannel.isCustom ? () => onRemoveChannel(openChannel.id) : undefined}
              />
            ) : (
              <div className="text-sm text-neutral-600">Выбери канал, чтобы открыть поля ввода.</div>
            )}
          </div>
        ) : null}
      </div>

      {/* Сайт */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <button
          onClick={() => setOpenSection((v) => (v === "site" ? null : "site"))}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="text-sm font-semibold text-neutral-900">Сайт</div>
          <div className="text-xs text-neutral-600">
            {openSection === "site" ? "Свернуть" : "Раскрыть"}
          </div>
        </button>

        {openSection === "site" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Визиты</div>
                <input
                  value={entry.site?.visits ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      site: {
                        ...(p.site || { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 }),
                        visits: toNumLoose(e.target.value),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="numeric"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Отказы, %</div>
                <input
                  value={entry.site?.bounceRate ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      site: {
                        ...(p.site || { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 }),
                        bounceRate: toNumLoose(e.target.value),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="decimal"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Время на сайте, сек</div>
                <input
                  value={entry.site?.avgTimeSec ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      site: {
                        ...(p.site || { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 }),
                        avgTimeSec: toNumLoose(e.target.value),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="numeric"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Глубина, страниц</div>
                <input
                  value={entry.site?.depth ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      site: {
                        ...(p.site || { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 }),
                        depth: toNumLoose(e.target.value),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onSave}
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Отправить
              </button>
              <button
                onClick={() =>
                  setEntry((p) => ({
                    ...p,
                    site: { visits: 0, bounceRate: 0, avgTimeSec: 0, depth: 0 },
                  }))
                }
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium hover:bg-neutral-50"
              >
                Сбросить
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Продажи */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <button
          onClick={() => setOpenSection((v) => (v === "sales" ? null : "sales"))}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="text-sm font-semibold text-neutral-900">Продажи</div>
          <div className="text-xs text-neutral-600">
            {openSection === "sales" ? "Свернуть" : "Раскрыть"}
          </div>
        </button>

        {openSection === "sales" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Квалифицированные заявки</div>
                <input
                  value={entry.sales?.sql ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      sales: { ...(p.sales || { sql: 0, sales: 0, revenue: 0 }), sql: toNumLoose(e.target.value) },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="numeric"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Продажи</div>
                <input
                  value={entry.sales?.sales ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      sales: { ...(p.sales || { sql: 0, sales: 0, revenue: 0 }), sales: toNumLoose(e.target.value) },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="numeric"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="text-xs text-neutral-600">Выручка</div>
                <input
                  value={entry.sales?.revenue ?? 0}
                  onChange={(e) =>
                    setEntry((p) => ({
                      ...p,
                      sales: { ...(p.sales || { sql: 0, sales: 0, revenue: 0 }), revenue: toNumLoose(e.target.value) },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onSave}
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Отправить
              </button>
              <button
                onClick={() =>
                  setEntry((p) => ({
                    ...p,
                    sales: { sql: 0, sales: 0, revenue: 0 },
                  }))
                }
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium hover:bg-neutral-50"
              >
                Сбросить
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Последние дни */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-sm font-semibold text-neutral-900">Последние дни</div>
        <div className="mt-1 text-xs text-neutral-600">Клик по строке — загрузим значения в форму.</div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="grid grid-cols-[0.6fr_0.6fr_0.6fr_0.6fr] bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-600">
            <div>Дата</div>
            <div>Расход</div>
            <div>Выручка</div>
            <div>Заявки</div>
          </div>

          <div className="divide-y divide-neutral-200">
            {lastDays.map((d) => {
              const t = totals(d);
              return (
                <button
                  key={d.date}
                  onClick={() => setDate(d.date)}
                  className="grid w-full grid-cols-[0.6fr_0.6fr_0.6fr_0.6fr] items-center px-4 py-3 text-left text-sm hover:bg-neutral-50"
                >
                  <div className="text-neutral-900">{d.date}</div>
                  <div className="text-neutral-900">{t.spend}</div>
                  <div className="text-neutral-900">{t.revenue}</div>
                  <div className="text-neutral-900">{t.leads}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
