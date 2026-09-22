import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getCurrentStore, listLocalStores } from "@/modules/stores/server/service";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [store, stores] = await Promise.all([getCurrentStore(), listLocalStores()]);

  if (!store) return <main className="admin-surface min-h-screen px-5 py-10">{children}</main>;

  return (
    <AppShell store={store} stores={stores}>
      {children}
    </AppShell>
  );
}
