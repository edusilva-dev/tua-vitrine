import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminAuditItemDTO,
  type AdminAuditListDTO,
  type AdminAuditListInput,
  adminAuditActionLabels,
  adminAuditActions,
} from "../contracts/audit";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function snapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;

  return JSON.stringify(value, null, 2);
}

function AuditSnapshot({ event }: { event: AdminAuditItemDTO }) {
  const before = snapshot(event.before);
  const after = snapshot(event.after);

  if (!before && !after && !event.errorCode) return null;

  return (
    <details className="mt-4 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground marker:text-primary">
        Ver dados operacionais
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {before ? (
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Antes
            </p>
            <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs whitespace-pre-wrap">
              {before}
            </pre>
          </div>
        ) : null}
        {after ? (
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Depois
            </p>
            <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs whitespace-pre-wrap">
              {after}
            </pre>
          </div>
        ) : null}
        {event.errorCode ? (
          <p className="text-sm text-destructive lg:col-span-2">Código: {event.errorCode}</p>
        ) : null}
      </div>
    </details>
  );
}

export function AuditList({
  result,
  filters,
}: {
  result: AdminAuditListDTO;
  filters: AdminAuditListInput;
}) {
  const pageUrl = (page: number) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (key !== "page" && value) params.set(key, String(value));
    }

    params.set("page", String(page));

    return `/super-admin/audit?${params}`;
  };

  return (
    <div className="space-y-4">
      <form className="grid gap-4 rounded-2xl border bg-card p-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="audit-store">ID da loja</Label>
          <Input
            id="audit-store"
            name="storeId"
            defaultValue={filters.storeId}
            placeholder="UUID da loja"
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="audit-admin">Administrador</Label>
          <Select name="adminId" defaultValue={filters.adminId ?? "ALL"}>
            <SelectTrigger id="audit-admin" className="w-full">
              <SelectValue placeholder="Todos os administradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os administradores</SelectItem>
              {result.admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.name} · {admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-action">Ação</Label>
          <Select name="action" defaultValue={filters.action ?? "ALL"}>
            <SelectTrigger id="audit-action" className="w-full">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as ações</SelectItem>
              {adminAuditActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {adminAuditActionLabels[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-result">Resultado</Label>
          <Select name="result" defaultValue={filters.result ?? "ALL"}>
            <SelectTrigger id="audit-result" className="w-full">
              <SelectValue placeholder="Todos os resultados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os resultados</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILURE">Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-from">De</Label>
          <Input id="audit-from" name="from" type="date" defaultValue={filters.from} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-to">Até</Label>
          <Input id="audit-to" name="to" type="date" defaultValue={filters.to} />
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-2 xl:col-span-4">
          <Button type="submit">Aplicar filtros</Button>
          <Button asChild variant="ghost">
            <Link href="/super-admin/audit">Limpar</Link>
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {result.items.length ? (
          result.items.map((event) => (
            <article key={event.id} className="border-b p-4 last:border-0 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={event.result === "SUCCESS" ? "secondary" : "destructive"}>
                      {event.result === "SUCCESS" ? <CheckCircle2 /> : <AlertTriangle />}
                      {event.result === "SUCCESS" ? "Sucesso" : "Falha"}
                    </Badge>
                    <Badge variant="outline">{adminAuditActionLabels[event.action]}</Badge>
                  </div>
                  <p className="mt-3 font-medium leading-6">{event.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      <UserRound className="mr-1 inline size-4" aria-hidden="true" />
                      {event.admin.name}
                    </span>
                    {event.store ? (
                      <Link
                        href={`/super-admin/stores/${event.store.id}`}
                        className="hover:text-foreground hover:underline"
                      >
                        <Store className="mr-1 inline size-4" aria-hidden="true" />
                        {event.store.name}
                      </Link>
                    ) : null}
                    <span>
                      <Clock3 className="mr-1 inline size-4" aria-hidden="true" />
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {event.resourceType} · {event.resourceId}
                </p>
              </div>
              <AuditSnapshot event={event} />
            </article>
          ))
        ) : (
          <div className="grid place-items-center gap-3 px-6 py-14 text-center">
            <History className="size-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">Nenhum evento encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros para consultar outro período.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {result.total} {result.total === 1 ? "evento" : "eventos"}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
            <Link href={pageUrl(result.page - 1)}>
              <ChevronLeft /> Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={result.page >= result.totalPages}>
            <Link href={pageUrl(result.page + 1)}>
              Próxima <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
