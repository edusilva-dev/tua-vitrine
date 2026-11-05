import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getOptionalAdminIdentity } from "@/lib/server/context";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { AnalyticsIdentity } from "@/modules/observability/components/analytics-identity";
import { toAnalyticsStoreGroup } from "@/modules/observability/contracts/store-group";
import { getCurrentStore } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const identity = await getOptionalAdminIdentity();

  if (!identity) redirect("/entrar");

  const authenticated = Boolean(identity.userId);

  const store = await getCurrentStore();
  const entitlements = store ? await getEntitlements({ storeId: store.id }) : null;

  return (
    <>
      <AnalyticsIdentity
        userId={identity.userId}
        store={store && entitlements ? toAnalyticsStoreGroup(store, entitlements.plan) : null}
      />
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
