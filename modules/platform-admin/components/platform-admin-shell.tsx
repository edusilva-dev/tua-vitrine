import { ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthAccountMenu } from "@/components/auth-account-menu";
import type { PlatformAdminIdentity } from "../server/access";

export function PlatformAdminShell({
  children,
  identity,
}: {
  children: ReactNode;
  identity: PlatformAdminIdentity;
}) {
  return (
    <div className="min-h-svh bg-muted/35">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/super-admin"
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Store className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">tua vitrine</span>
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">Operação da plataforma</span>
          </div>
          <p className="hidden max-w-48 truncate text-sm text-muted-foreground md:block">
            {identity.name}
          </p>
          <AuthAccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
