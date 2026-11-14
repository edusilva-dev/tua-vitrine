import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PlatformAdminShell } from "@/modules/platform-admin/components/platform-admin-shell";
import { getOptionalPlatformAdminIdentity } from "@/modules/platform-admin/server/access";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const identity = await getOptionalPlatformAdminIdentity();

  if (!identity) notFound();

  return <PlatformAdminShell identity={identity}>{children}</PlatformAdminShell>;
}
