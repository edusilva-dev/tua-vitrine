"use client";
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Megaphone,
  Menu,
  Package,
  Paintbrush,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthAccountMenu } from "@/components/auth-account-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { StoreDTO } from "@/modules/stores/contracts";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/products", label: "Meus produtos", icon: Package },
  { href: "/admin/metrics", label: "Estatísticas", icon: BarChart3 },
  { href: "/admin/promotions", label: "Campanhas", icon: Megaphone },
  { href: "/admin/billing", label: "Assinatura", icon: CreditCard },
  { href: "/admin/settings", label: "Minha vitrine", icon: Paintbrush },
  { href: "/admin/support", label: "Suporte", icon: LifeBuoy },
];

export function AppShell({
  store,
  children,
  authenticated,
  platformAdmin,
}: {
  store: StoreDTO;
  children: React.ReactNode;
  authenticated: boolean;
  platformAdmin: boolean;
}) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavigating = pendingPath !== null && pendingPath !== pathname;
  const currentLink = links.find(({ href }) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  );

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function startNavigation(href: string) {
    setMobileMenuOpen(false);

    if (pathname !== href) setPendingPath(href);
  }

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    setPendingPath(null);
  }, [pathname]);

  if (pathname === "/admin/preview") return <>{children}</>;

  return (
    <div className="admin-surface min-h-screen" aria-busy={isNavigating}>
      {isNavigating ? (
        <div
          role="status"
          aria-label="Carregando página"
          className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/20"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      ) : null}
      <aside className="admin-sidebar hidden lg:fixed lg:inset-y-0 lg:block lg:w-64">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-6 py-8 text-2xl font-bold tracking-tight"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-brand-lime text-brand-forest">
            <Store size={23} />
          </span>
          tua vitrine<span className="text-brand-lime">.</span>
        </Link>
        <div className="px-5 pb-6">
          <p className="mb-2 text-[10px] font-semibold tracking-[.18em] text-white/45">
            SEU NEGÓCIO
          </p>
          <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white">
            {store.name}
          </div>
        </div>
        <nav aria-label="Menu principal" className="flex flex-col gap-1 px-3 pb-4">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              onClick={() => {
                startNavigation(href);
              }}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                isActive(href)
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {isNavigating && pendingPath === href ? (
                <Loader2 size={19} className="animate-spin" aria-hidden="true" />
              ) : (
                <Icon size={19} aria-hidden="true" />
              )}
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 lg:absolute lg:bottom-8 lg:block lg:w-full">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">Seu negócio, mais perto.</p>
            <p className="mt-2 text-xs leading-relaxed text-white/55">
              Uma vitrine bonita. Uma conversa. Uma nova venda.
            </p>
          </div>
          {!authenticated && (
            <p className="mt-3 text-[10px] text-white/35">AMBIENTE LOCAL · PROTÓTIPO</p>
          )}
        </div>
      </aside>
      <header className="sticky top-0 z-40 flex h-16 min-w-0 items-center gap-3 border-b border-black/5 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <Link
          href="/admin"
          aria-label="Ir para a visão geral"
          onClick={() => startNavigation("/admin")}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-forest text-brand-lime"
        >
          <Store size={21} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {currentLink?.label ?? "Painel do lojista"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{store.name}</p>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 bg-white"
              aria-label="Abrir menu principal"
            >
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="admin-sidebar w-4/5 max-w-sm border-white/10 bg-brand-forest p-0 text-white"
          >
            <SheetHeader className="gap-4 border-b border-white/10 p-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-lime text-brand-forest">
                    <Store size={21} aria-hidden="true" />
                  </span>
                  <SheetTitle className="truncate text-lg font-bold tracking-tight text-white">
                    tua vitrine<span className="text-brand-lime">.</span>
                  </SheetTitle>
                </div>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-white hover:bg-white/10 hover:text-white"
                    aria-label="Fechar menu principal"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </SheetClose>
              </div>
              <div className="min-w-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-[.16em] text-white/45">
                  SEU NEGÓCIO
                </p>
                <p className="mt-1 truncate text-sm font-medium text-white">{store.name}</p>
              </div>
              <SheetDescription className="sr-only">
                Escolha uma seção do painel para administrar sua vitrine.
              </SheetDescription>
            </SheetHeader>
            <nav
              aria-label="Menu principal"
              className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
            >
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  onClick={() => startNavigation(href)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    isActive(href)
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {isNavigating && pendingPath === href ? (
                    <Loader2 size={19} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon size={19} aria-hidden="true" />
                  )}
                  {label}
                </Link>
              ))}
            </nav>
            <SheetFooter className="gap-2 border-t border-white/10 p-3">
              {platformAdmin && (
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 w-full justify-start px-3 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/super-admin">
                    <ShieldCheck aria-hidden="true" />
                    Operação da plataforma
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="ghost"
                className="h-11 w-full justify-start px-3 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/admin/preview" onClick={() => startNavigation("/admin/preview")}>
                  <ArrowUpRight aria-hidden="true" />
                  Ver minha vitrine
                </Link>
              </Button>
              {authenticated && (
                <div className="border-t border-white/10 pt-2 [&_button]:text-white [&_button]:hover:bg-white/10 [&_button]:hover:text-white">
                  <AuthAccountMenu menuItem />
                </div>
              )}
              {!authenticated && (
                <p className="px-3 py-1 text-[10px] text-white/35">AMBIENTE LOCAL · PROTÓTIPO</p>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </header>
      <div className="min-w-0 lg:pl-64">
        <header className="hidden min-h-20 min-w-0 items-center justify-between gap-2 border-b border-black/5 bg-white/60 px-10 lg:flex">
          <div className="flex min-w-0 flex-1 items-center">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Painel do lojista
            </span>
            <span className="mx-3 hidden text-border sm:inline">/</span>
            <span className="truncate text-sm font-medium">{store.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {platformAdmin && (
              <Button asChild variant="ghost" className="hidden xl:inline-flex">
                <Link href="/super-admin">
                  <ShieldCheck aria-hidden="true" />
                  Operação
                </Link>
              </Button>
            )}
            {authenticated && <AuthAccountMenu />}
            <Button asChild variant="outline" className="size-9 bg-white px-0 sm:w-auto sm:px-4">
              <Link
                href="/admin/preview"
                onClick={() => {
                  startNavigation("/admin/preview");
                }}
              >
                <span className="sr-only sm:not-sr-only">Ver minha vitrine</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-5 lg:px-10 lg:py-10">
          {store.onboardingStep < 4 && pathname !== "/admin/onboarding" && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>Sua vitrine está quase pronta. Termine a configuração para publicar.</p>
              <Button asChild size="sm">
                <Link href="/admin/onboarding">Continuar configuração</Link>
              </Button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
