import { redirect } from "next/navigation";

import { withBasePath } from "@/app/lib/publicBasePath";

export default function SpecialistsCatalogRedirect() {
  redirect(withBasePath("/app/specialists"));
}
