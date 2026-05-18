import { redirect } from "next/navigation";

import { withBasePath } from "@/app/lib/publicBasePath";

export default function DataRedirectPage() {
  redirect(withBasePath("/app/systems?tab=manual"));
}
