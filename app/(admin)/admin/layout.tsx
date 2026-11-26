import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getOptionalAdminIdentity } from "@/lib/server/context";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { AnalyticsIdentity } from "@/modules/observability/components/analytics-identity";
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
  const entitlements = store ? await getEntitlements({ storeId: store.id }) : null;

  return (
    <>
      {identity.userId || (store && entitlements) ? (
        <AnalyticsIdentity
          {...(identity.userId ? { userId: identity.userId } : {})}
          {...(store && entitlements
            ? {
                store: {
                  storeId: store.id,
                  plan: entitlements.plan,
                  status: store.status,
                  onboardingStep: store.onboardingStep,
                },
              }
            : {})}
        />
      ) : null}
      {store ? (
        <AppShell store={store} authenticated={authenticated} platformAdmin={platformAdmin}>
          {children}
        </AppShell>
      ) : (
        <main className="admin-surface min-h-screen px-5 py-10">{children}</main>
      )}
    </>
  );
}
