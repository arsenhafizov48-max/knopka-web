import { redirect } from "next/navigation";

import { withBasePath } from "@/app/lib/publicBasePath";

export default function ManualDataPage() {
  redirect(withBasePath("/app/systems?tab=manual"));
}
