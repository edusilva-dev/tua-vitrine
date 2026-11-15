import { ChevronLeft, ChevronRight, Search, Store } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PlatformStoreListDTO,
  PlatformStoreListInput,
  PlatformStoreListItemDTO,
} from "../contracts/stores";

const planLabels = { FREE: "Free", ESSENTIAL: "Essencial", PROFESSIONAL: "Profissional" };
const statusLabels = { DRAFT: "Rascunho", ACTIVE: "Ativa" };
const subscriptionLabels = {
  INCOMPLETE: "Incompleta",
  INCOMPLETE_EXPIRED: "Incompleta expirada",
  TRIALING: "Trial Stripe",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Cancelada",
  UNPAID: "Não paga",
  PAUSED: "Pausada",
} as const;

function listUrl(values: PlatformStoreListInput, page: number): string {
  const params = new URLSearchParams();

  if (values.q) params.set("q", values.q);

  if (values.status) params.set("status", values.status);

  if (values.plan) params.set("plan", values.plan);

  if (values.subscription) params.set("subscription", values.subscription);

  if (page > 1) params.set("page", String(page));

  const query = params.toString();

  return query ? `/super-admin?${query}` : "/super-admin";
}

function StoreBadges({ store }: { store: PlatformStoreListItemDTO }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={store.status === "ACTIVE" ? "default" : "secondary"}>
        {statusLabels[store.status]}
      </Badge>
      <Badge variant="outline">{planLabels[store.plan]}</Badge>
      {store.subscriptionStatus && (
        <Badge variant="outline">{subscriptionLabels[store.subscriptionStatus]}</Badge>
      )}
    </div>
  );
}

export function StoreList({
  result,
  filters,
}: {
  result: PlatformStoreListDTO;
  filters: PlatformStoreListInput;
}) {
  return (
    <div className="space-y-6">
      <form className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_11rem_11rem_13rem_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="store-search">Buscar loja</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="store-search"
                name="q"
                defaultValue={filters.q}
                maxLength={100}
                className="pl-9"
                placeholder="Nome, slug, e-mail ou ID"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-status">Estado</Label>
            <select
              id="store-status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativa</option>
              <option value="DRAFT">Rascunho</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-plan">Plano</Label>
            <select
              id="store-plan"
              name="plan"
              defaultValue={filters.plan ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Todos</option>
              <option value="FREE">Free</option>
              <option value="ESSENTIAL">Essencial</option>
              <option value="PROFESSIONAL">Profissional</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscription-status">Assinatura</Label>
            <select
              id="subscription-status"
              name="subscription"
              defaultValue={filters.subscription ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Todas</option>
              <option value="NONE">Sem assinatura</option>
              {Object.entries(subscriptionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Buscar</Button>
            <Button asChild variant="ghost">
              <Link href="/super-admin">Limpar</Link>
            </Button>
          </div>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-heading font-semibold">Lojas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.total === 1 ? "1 resultado" : `${result.total} resultados`}
            </p>
          </div>
          {result.total > 0 && (
            <p className="text-sm text-muted-foreground">
              Página {result.page} de {result.totalPages}
            </p>
          )}
        </div>

        {result.items.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <Store className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-4 font-medium">Nenhuma loja encontrada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste os termos ou limpe os filtros para tentar novamente.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {result.items.map((store) => (
                <article key={store.id} className="space-y-3 p-4">
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/{store.slug}</p>
                  </div>
                  <StoreBadges store={store} />
                  <div className="text-sm">
                    <p className="truncate">{store.owner?.name ?? "Sem proprietário"}</p>
                    <p className="truncate text-muted-foreground">
                      {store.owner?.email ?? "Nenhum e-mail associado"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criada em {new Date(store.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Loja</th>
                    <th className="px-5 py-3 font-medium">Proprietário</th>
                    <th className="px-5 py-3 font-medium">Estado e plano</th>
                    <th className="px-5 py-3 font-medium">Criação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.items.map((store) => (
                    <tr key={store.id}>
                      <td className="px-5 py-4">
                        <p className="max-w-64 truncate font-medium">{store.name}</p>
                        <p className="mt-0.5 max-w-64 truncate text-muted-foreground">
                          /{store.slug}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="max-w-72 truncate">
                          {store.owner?.name ?? "Sem proprietário"}
                        </p>
                        <p className="mt-0.5 max-w-72 truncate text-muted-foreground">
                          {store.owner?.email ?? "Nenhum e-mail associado"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StoreBadges store={store} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {new Date(store.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result.totalPages > 1 && (
          <nav
            aria-label="Paginação das lojas"
            className="flex items-center justify-between gap-4 border-t px-4 py-3 sm:px-5"
          >
            <Button
              asChild={result.page > 1}
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
            >
              {result.page > 1 ? (
                <Link href={listUrl(filters, result.page - 1)}>
                  <ChevronLeft aria-hidden="true" />
                  Anterior
                </Link>
              ) : (
                <span>
                  <ChevronLeft aria-hidden="true" />
                  Anterior
                </span>
              )}
            </Button>
            <Button
              asChild={result.page < result.totalPages}
              variant="outline"
              size="sm"
              disabled={result.page >= result.totalPages}
            >
              {result.page < result.totalPages ? (
                <Link href={listUrl(filters, result.page + 1)}>
                  Próxima
                  <ChevronRight aria-hidden="true" />
                </Link>
              ) : (
                <span>
                  Próxima
                  <ChevronRight aria-hidden="true" />
                </span>
              )}
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}
