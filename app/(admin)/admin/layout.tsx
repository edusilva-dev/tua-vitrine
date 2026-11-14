import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getOptionalAdminIdentity } from "@/lib/server/context";
import { resolvePlatformAdmin } from "@/modules/platform-admin/server/access";
import { getCurrentStore } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const identity = await getOptionalAdminIdentity();

  if (!identity) redirect("/entrar");

  const authenticated = Boolean(identity.userId);
  const platformAdmin = identity.userId
    ? Boolean(await resolvePlatformAdmin(identity.userId))
    : false;

  const store = await getCurrentStore();

  if (!store) return <main className="admin-surface min-h-screen px-5 py-10">{children}</main>;

  return (
    <AppShell store={store} authenticated={authenticated} platformAdmin={platformAdmin}>
      {children}
    </AppShell>
  );
}
