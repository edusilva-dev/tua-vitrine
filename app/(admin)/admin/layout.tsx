import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getOptionalAdminIdentity } from "@/lib/server/context";
import { AnalyticsIdentity } from "@/modules/observability/components/analytics-identity";
import { getCurrentStore } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const identity = await getOptionalAdminIdentity();

  if (!identity) redirect("/entrar");

  const authenticated = Boolean(identity.userId);

  const store = await getCurrentStore();

  return (
    <>
      <AnalyticsIdentity userId={identity.userId} />
      {store ? (
        <AppShell store={store} authenticated={authenticated}>
          {children}
        </AppShell>
      ) : (
        <main className="admin-surface min-h-screen px-5 py-10">{children}</main>
      )}
    </>
  );
}
