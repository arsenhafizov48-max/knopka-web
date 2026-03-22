import type { ProjectFact } from "@/app/app/lib/projectFact";


export type OnboardingFieldKey =
| "projectName"
| "niche"
| "geo"
| "goal"
| "currentRevenue"
| "currentClients"
| "targetRevenue"
| "targetClients";


const ERR_KEY = "knopka.onboarding.errors";


export function setOnboardingErrors(
step: 1 | 2 | 3 | 4,
fields: OnboardingFieldKey[]
) {
if (typeof window === "undefined") return;
window.sessionStorage.setItem(ERR_KEY, JSON.stringify({ step, fields }));
}


export function consumeOnboardingErrors(step: 1 | 2 | 3 | 4): OnboardingFieldKey[] {
if (typeof window === "undefined") return [];
const raw = window.sessionStorage.getItem(ERR_KEY);
if (!raw) return [];
try {
const parsed = JSON.parse(raw) as {
step: number;
fields: OnboardingFieldKey[];
};
if (parsed?.step === step && Array.isArray(parsed.fields)) {
window.sessionStorage.removeItem(ERR_KEY);
return parsed.fields;
}
return [];
} catch {
return [];
}
}


export function validateRequiredStep1(
f: ProjectFact
): { ok: boolean; fields: OnboardingFieldKey[] } {
const fields: OnboardingFieldKey[] = [];


if (!String(f?.projectName ?? "").trim()) fields.push("projectName");
if (!String(f?.niche ?? "").trim()) fields.push("niche");
if (!String(f?.geo ?? "").trim()) fields.push("geo");
if (!String(f?.goal ?? "").trim()) fields.push("goal");
if (!String(f?.currentRevenue ?? "").trim()) fields.push("currentRevenue");
if (!String(f?.currentClients ?? "").trim()) fields.push("currentClients");
if (!String(f?.targetRevenue ?? "").trim()) fields.push("targetRevenue");
if (!String(f?.targetClients ?? "").trim()) fields.push("targetClients");


return { ok: fields.length === 0, fields };
}


export function firstInvalidStep(
f: ProjectFact
): { step: 1 | 2 | 3 | 4 | null; fields?: OnboardingFieldKey[] } {
const v1 = validateRequiredStep1(f);
if (!v1.ok) return { step: 1, fields: v1.fields };
return { step: null };
}