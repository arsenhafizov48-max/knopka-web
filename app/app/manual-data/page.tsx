import { redirect } from "next/navigation";

/** Временный редирект: ежедневный ввод будет здесь или в «Данные» */
export default function ManualDataPage() {
  redirect("/app/data");
}
