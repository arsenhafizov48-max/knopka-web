// app/demo/page.tsx — редирект: демо-страница убрана из основного сценария
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export default async function DemoPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  redirect("/app/dashboard");
}
