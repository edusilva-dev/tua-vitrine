import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PlatformAdminShell } from "@/modules/platform-admin/components/platform-admin-shell";
import { getOptionalPlatformAdminIdentity } from "@/modules/platform-admin/server/access";
import { countNewSupportRequests } from "@/modules/platform-admin/server/support";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const identity = await getOptionalPlatformAdminIdentity();

  if (!identity) notFound();

  const newSupportCount = await countNewSupportRequests();

  return (
    <PlatformAdminShell identity={identity} newSupportCount={newSupportCount}>
      {children}
    </PlatformAdminShell>
  );
}
