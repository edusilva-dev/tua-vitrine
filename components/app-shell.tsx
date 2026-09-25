"use client";
import { ArrowUpRight, BarChart3, LayoutDashboard, Package, Paintbrush, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthAccountMenu } from "@/components/auth-account-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StoreDTO } from "@/modules/stores/contracts";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/products", label: "Meus produtos", icon: Package },
  { href: "/admin/metrics", label: "Estatísticas", icon: BarChart3 },
  { href: "/admin/settings", label: "Minha vitrine", icon: Paintbrush },
];

export function AppShell({
  store,
  children,
  authenticated,
}: {
  store: StoreDTO;
  children: React.ReactNode;
  authenticated: boolean;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/preview") return <>{children}</>;

  return (
    <div className="admin-surface min-h-screen">
      <aside className="admin-sidebar lg:fixed lg:inset-y-0 lg:w-64">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-6 py-8 text-2xl font-bold tracking-tight"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[#d5e9bc] text-[#183c3d]">
            <Store size={23} />
          </span>
          tua vitrine<span className="text-[#d5e9bc]">.</span>
        </Link>
        <div className="px-5 pb-6">
          <p className="mb-2 text-[10px] font-semibold tracking-[.18em] text-white/45">
            SEU NEGÓCIO
          </p>
          <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white">
            {store.name}
          </div>
        </div>
        <nav
          aria-label="Menu principal"
          className="flex overflow-x-auto gap-1 px-3 pb-4 lg:flex-col"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                pathname === href
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={19} />
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
      <div className="lg:pl-64">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-black/5 bg-white/60 px-5 lg:px-10">
          <div>
            <span className="text-sm text-muted-foreground">Painel do lojista</span>
            <span className="mx-3 text-border">/</span>
            <span className="text-sm font-medium">{store.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {authenticated && <AuthAccountMenu />}
            <Button asChild variant="outline" className="bg-white">
              <Link href="/admin/preview">
                Ver minha vitrine
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10">
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
