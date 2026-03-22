"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Trash2, Paperclip } from "lucide-react";

import SaveToast from "@/app/components/SaveToast";
import OnboardingStepsNav from "@/app/components/OnboardingStepsNav";

import {
  loadProjectFact,
  patchProjectFact,
  setLastStep,
} from "@/app/app/lib/projectFact";

type Fact = ReturnType<typeof loadProjectFact>;

/**
 * MVP-хранилище файлов: IndexedDB (локально в браузере).
 * Почему так: localStorage не подходит для больших файлов.
 * Потом можно заменить на Supabase Storage/облако.
 */
const DB_NAME = "knopka-files";
const DB_VERSION = 1;
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type StoredFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  updatedAt: string;
  blob: Blob;
};

function uid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function packRef(id: string, name: string) {
  // строковый формат, чтобы не менять тип в projectFact
  // хранится так: "<id>|<filename>"
  return `${id}|${name}`;
}

function unpackRef(ref: string): { id: string; name: string } {
  const i = ref.indexOf("|");
  if (i === -1) return { id: ref, name: ref };
  return { id: ref.slice(0, i), name: ref.slice(i + 1) };
}

async function putFile(file: File): Promise<{ id: string; name: string }> {
  const db = await openDb();
  const id = uid();

  const payload: StoredFile = {
    id,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(payload);
  });

  db.close();
  return { id, name: file.name };
}

async function removeFile(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
  db.close();
}

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function Section({
  title,
  subtitle,
  refs,
  onPick,
  onDelete,
  inputRef,
  dropActive,
  onDropZoneDragEnter,
  onDropZoneDragLeave,
  onDropZoneDragOver,
  onDropZoneDrop,
  hint,
}: {
  title: string;
  subtitle: string;
  refs: string[];
  onPick: () => void;
  onDelete: (ref: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dropActive: boolean;
  onDropZoneDragEnter: (e: React.DragEvent) => void;
  onDropZoneDragLeave: (e: React.DragEvent) => void;
  onDropZoneDragOver: (e: React.DragEvent) => void;
  onDropZoneDrop: (e: React.DragEvent) => void;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{title}</div>
          <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>
        </div>

        <button
          type="button"
          onClick={onPick}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          <Paperclip className="h-4 w-4" />
          Добавить
        </button>
      </div>

      <div
        className={cn(
          "mt-3 rounded-2xl border border-dashed p-4",
          dropActive
            ? "border-blue-500 bg-blue-50"
            : "border-neutral-200 bg-neutral-50"
        )}
        onDragEnter={onDropZoneDragEnter}
        onDragLeave={onDropZoneDragLeave}
        onDragOver={onDropZoneDragOver}
        onDrop={onDropZoneDrop}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white">
            <FileUp className="h-4 w-4 text-neutral-700" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-neutral-900">
              Перетащите файлы сюда или нажмите «Добавить»
            </div>
            <div className="mt-1 text-xs text-neutral-500">{hint}</div>
          </div>
        </div>

        {refs.length === 0 ? (
          <div className="mt-3 text-xs text-neutral-500">Файлы пока не загружены.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {refs.map((r) => {
              const { name } = unpackRef(r);
              return (
                <div
                  key={r}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0 truncate text-sm text-neutral-900">
                    {name}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(r)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
                    aria-label="Удалить файл"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4 text-neutral-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* hidden input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={() => {
            // обработку делаем снаружи через inputRef.files
          }}
        />
      </div>

      <div className="mt-2 text-[11px] text-neutral-500">
        Файлы хранятся локально в вашем браузере (MVP). В проде можно заменить на облачное хранилище.
      </div>
    </div>
  );
}

export default function OnboardingStep4Page() {
  const router = useRouter();

  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fact, setFact] = useState<Fact>(() => loadProjectFact());

  const [commercialRefs, setCommercialRefs] = useState<string[]>(
    () => fact.materials?.commercialFiles ?? []
  );
  const [priceRefs, setPriceRefs] = useState<string[]>(
    () => fact.materials?.priceFiles ?? []
  );
  const [brandRefs, setBrandRefs] = useState<string[]>(
    () => fact.materials?.brandFiles ?? []
  );
  const [aiComment, setAiComment] = useState<string>(
    () => fact.materials?.aiComment ?? ""
  );

  // drag states
  const [dragCommercial, setDragCommercial] = useState(false);
  const [dragPrice, setDragPrice] = useState(false);
  const [dragBrand, setDragBrand] = useState(false);

  const inputCommercial = useRef<HTMLInputElement | null>(null);
  const inputPrice = useRef<HTMLInputElement | null>(null);
  const inputBrand = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // если фактура изменилась извне — подтягиваем
    const onUpdated = () => {
      const next = loadProjectFact();
      setFact(next);
      setCommercialRefs(next.materials?.commercialFiles ?? []);
      setPriceRefs(next.materials?.priceFiles ?? []);
      setBrandRefs(next.materials?.brandFiles ?? []);
      setAiComment(next.materials?.aiComment ?? "");
    };
    window.addEventListener("knopka:projectFactUpdated", onUpdated);
    return () => window.removeEventListener("knopka:projectFactUpdated", onUpdated);
  }, []);

  const showSaved = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 1400);
  };

  const canGoReview = useMemo(() => true, []);

  async function addFiles(target: "commercial" | "price" | "brand", files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    // сохраняем в IndexedDB и в проектFact пишем refs
    const created: string[] = [];
    for (const f of list) {
      const { id, name } = await putFile(f);
      created.push(packRef(id, name));
    }

    if (target === "commercial") setCommercialRefs((p) => [...created, ...p]);
    if (target === "price") setPriceRefs((p) => [...created, ...p]);
    if (target === "brand") setBrandRefs((p) => [...created, ...p]);
  }

  async function deleteRef(ref: string, target: "commercial" | "price" | "brand") {
    const { id } = unpackRef(ref);
    await removeFile(id);

    if (target === "commercial") setCommercialRefs((p) => p.filter((x) => x !== ref));
    if (target === "price") setPriceRefs((p) => p.filter((x) => x !== ref));
    if (target === "brand") setBrandRefs((p) => p.filter((x) => x !== ref));
  }

  async function save() {
    setSaving(true);

    patchProjectFact({
      materials: {
        commercialFiles: commercialRefs,
        priceFiles: priceRefs,
        brandFiles: brandRefs,
        aiComment,
      },
    });

    setLastStep(4);

    // обновим локально
    setFact(loadProjectFact());

    showSaved();
    window.setTimeout(() => setSaving(false), 150);
  }

  return (
    <div className="mx-auto w-full max-w-none px-0">
      <SaveToast
        open={toast}
        onClose={() => setToast(false)}
        title="Данные сохранены"
        variant="success"
      />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="text-xs text-neutral-500">Шаг 4 из 4</div>
            <div className="mt-1 text-2xl font-semibold">Материалы</div>

            <div className="mt-4">
              <OnboardingStepsNav currentStep={4} />
            </div>

            <div className="mt-4 text-sm text-neutral-600">
              Загрузите ключевые материалы. Этого достаточно, чтобы «КНОПКА» поняла ваш продукт.
              Мы анализируем только файлы, которые вы загружаете сюда. Никаких внешних папок и ссылок.
            </div>

            <div className="mt-6 space-y-4">
              <Section
                title="Коммерческие предложения"
                subtitle="Ваши КП для клиентов: PDF, презентации, готовые офферы под разные сегменты."
                refs={commercialRefs}
                inputRef={inputCommercial}
                dropActive={dragCommercial}
                onPick={() => inputCommercial.current?.click()}
                onDelete={(r) => deleteRef(r, "commercial")}
                onDropZoneDragEnter={(e) => {
                  e.preventDefault();
                  setDragCommercial(true);
                }}
                onDropZoneDragLeave={(e) => {
                  e.preventDefault();
                  setDragCommercial(false);
                }}
                onDropZoneDragOver={(e) => {
                  e.preventDefault();
                  setDragCommercial(true);
                }}
                onDropZoneDrop={async (e) => {
                  e.preventDefault();
                  setDragCommercial(false);
                  if (e.dataTransfer?.files?.length) {
                    await addFiles("commercial", e.dataTransfer.files);
                  }
                }}
                hint="Форматы: PDF, PPTX/Keynote, изображения, Excel. Можно загрузить несколько вариантов под разные услуги/аудитории."
              />

              <Section
                title="Прайс и услуги"
                subtitle="Прайс-листы и таблицы с услугами и ценами. На их основе «КНОПКА» соберёт карту продукта."
                refs={priceRefs}
                inputRef={inputPrice}
                dropActive={dragPrice}
                onPick={() => inputPrice.current?.click()}
                onDelete={(r) => deleteRef(r, "price")}
                onDropZoneDragEnter={(e) => {
                  e.preventDefault();
                  setDragPrice(true);
                }}
                onDropZoneDragLeave={(e) => {
                  e.preventDefault();
                  setDragPrice(false);
                }}
                onDropZoneDragOver={(e) => {
                  e.preventDefault();
                  setDragPrice(true);
                }}
                onDropZoneDrop={async (e) => {
                  e.preventDefault();
                  setDragPrice(false);
                  if (e.dataTransfer?.files?.length) {
                    await addFiles("price", e.dataTransfer.files);
                  }
                }}
                hint="Форматы: Excel/Google Sheets (выгрузка), PDF, изображения. Если прайсов несколько — загружайте все, платформа сама сопоставит."
              />

              <Section
                title="Фирменный стиль"
                subtitle="Логотипы, гайд по стилю, примеры оформления (сайт, посты, визитки, вывески)."
                refs={brandRefs}
                inputRef={inputBrand}
                dropActive={dragBrand}
                onPick={() => inputBrand.current?.click()}
                onDelete={(r) => deleteRef(r, "brand")}
                onDropZoneDragEnter={(e) => {
                  e.preventDefault();
                  setDragBrand(true);
                }}
                onDropZoneDragLeave={(e) => {
                  e.preventDefault();
                  setDragBrand(false);
                }}
                onDropZoneDragOver={(e) => {
                  e.preventDefault();
                  setDragBrand(true);
                }}
                onDropZoneDrop={async (e) => {
                  e.preventDefault();
                  setDragBrand(false);
                  if (e.dataTransfer?.files?.length) {
                    await addFiles("brand", e.dataTransfer.files);
                  }
                }}
                hint="Форматы: PDF, PNG, JPG. Мы не меняем ваш стиль — опираемся на него в рекомендациях."
              />

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">
                  Комментарий для ИИ (что важно учесть)
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Например: «У нас средний чек 12–15 тыс., важны постоянные клиенты, делаем упор на сервис и экспертность».
                </div>
                <textarea
                  value={aiComment}
                  onChange={(e) => setAiComment(e.target.value)}
                  placeholder="Напишите, что важно учесть при рекомендациях"
                  className="mt-3 min-h-[110px] w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-blue-300"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/app/onboarding/step-3")}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm hover:bg-neutral-50"
              >
                Назад
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className={cn(
                    "rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium hover:bg-neutral-50",
                    saving && "opacity-60"
                  )}
                >
                  Сохранить
                </button>

                <button
                  type="button"
                  disabled={!canGoReview}
                  onClick={async () => {
                    await save();
                    router.push("/app/onboarding/review");
                  }}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Перейти к проверке
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 self-start">
            <div className="text-sm font-semibold text-neutral-900">
              Что важно загрузить в первую очередь
            </div>
            <div className="mt-2 space-y-3 text-sm text-neutral-600">
              <p>
                Для старта «Кнопке» достаточно понять три вещи: что вы продаёте, по каким ценам и как вы это упаковали.
              </p>
              <p>
                Коммерческие предложения покажут логику офферов, структуру аргументов и акценты на выгоде.
              </p>
              <p>
                Прайсы и таблицы с услугами помогут собрать карту продукта: базовые услуги, доппродажи, пакеты, уровни.
              </p>
              <p>
                Фирменный стиль нужен, чтобы рекомендации по упаковке не ломали текущий образ компании.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              Превью: краткий отчёт по продукту и офферам на основе ваших материалов.
            </div>
          </div>
        </div>
      </div>

      {/*
        ВАЖНО: нативный input onChange
        (снаружи, чтобы не плодить 3 обработчика прямо в Section)
      */}
      <input
        className="hidden"
        aria-hidden
        ref={(el) => {
          // чтобы не ругался react — это просто заглушка
        }}
      />

      {/* подцепляем onChange для всех 3 инпутов */}
      <div className="hidden">
        <input
          ref={inputCommercial}
          type="file"
          multiple
          onChange={async (e) => {
            const files = e.currentTarget.files;
            if (files?.length) await addFiles("commercial", files);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={inputPrice}
          type="file"
          multiple
          onChange={async (e) => {
            const files = e.currentTarget.files;
            if (files?.length) await addFiles("price", files);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={inputBrand}
          type="file"
          multiple
          onChange={async (e) => {
            const files = e.currentTarget.files;
            if (files?.length) await addFiles("brand", files);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
