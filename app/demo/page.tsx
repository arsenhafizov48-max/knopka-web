// app/demo/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export default async function DemoPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white p-10">
      <h1 className="text-2xl font-semibold">Демо КНОПКИ</h1>
      <p className="mt-3 text-black/70">
        Ты залогинен как: <span className="font-medium">{data.user.email}</span>
      </p>

      <a className="mt-6 inline-block text-[#6B5CFF] hover:underline" href="/">
        ← На главную
      </a>
    </div>
  );
}
