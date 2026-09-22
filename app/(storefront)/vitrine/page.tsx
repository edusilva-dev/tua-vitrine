import { redirect } from "next/navigation";
import { getCurrentStore } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function FixedStorePage() {
  const store = await getCurrentStore();

  if (store?.status !== "ACTIVE") redirect("/admin/onboarding");

  redirect(`/${store.slug}`);
}
