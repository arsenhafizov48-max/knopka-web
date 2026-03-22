"use client";


export default function FileUploadBlock({
title,
hint,
files,
onPick,
onRemove,
accept,
}: {
title: string;
hint: string;
files: string[];
onPick: (picked: FileList) => void;
onRemove: (name: string) => void;
accept?: string;
}) {
return (
<div className="rounded-2xl border border-neutral-200 bg-white p-5">
<div className="text-[16px] font-semibold text-neutral-900">{title}</div>
<div className="mt-1 text-sm text-neutral-600">{hint}</div>


<label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5 hover:bg-neutral-100">
<div className="text-sm font-medium text-neutral-900">Загрузить файл</div>
<div className="mt-1 text-xs text-neutral-500">
MVP: файл хранится в браузере (сохраняем название)
</div>
<input
type="file"
accept={accept}
className="hidden"
onChange={(e) => {
const f = e.target.files;
if (f && f.length) onPick(f);
e.currentTarget.value = "";
}}
/>
</label>


{files.length > 0 ? (
<div className="mt-4 space-y-2">
{files.map((name) => (
<div
key={name}
className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2"
>
<div className="min-w-0">
<div className="truncate text-sm text-neutral-900">{name}</div>
</div>
<button
type="button"
onClick={() => onRemove(name)}
className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
>
Удалить
</button>
</div>
))}
</div>
) : null}
</div>
);
}