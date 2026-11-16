import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Mail, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportCategoryLabels } from "@/modules/support/contracts";
import type { SupportListDTO, SupportListInput } from "../contracts/support";

const statusLabels = { NEW: "Novo", IN_PROGRESS: "Em atendimento", RESOLVED: "Resolvido" } as const;

export function SupportList({
  result,
  filters,
}: {
  result: SupportListDTO;
  filters: SupportListInput;
}) {
  const url = (page: number) => {
    const p = new URLSearchParams();

    if (filters.q) p.set("q", filters.q);

    if (filters.status) p.set("status", filters.status);

    if (filters.category) p.set("category", filters.category);

    if (filters.storeId) p.set("storeId", filters.storeId);

    if (filters.period) p.set("period", String(filters.period));

    p.set("page", String(page));

    return `/super-admin/support?${p}`;
  };

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_210px_160px_auto]">
        {filters.storeId ? <input type="hidden" name="storeId" value={filters.storeId} /> : null}
        <div className="relative">
          <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Assunto, loja ou e-mail"
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={filters.status ?? "ALL"}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os estados</SelectItem>
            <SelectItem value="NEW">Novos</SelectItem>
            <SelectItem value="IN_PROGRESS">Em atendimento</SelectItem>
            <SelectItem value="RESOLVED">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
        <Select name="period" defaultValue={filters.period ? String(filters.period) : "ALL"}>
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todo o período</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select name="category" defaultValue={filters.category ?? "ALL"}>
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {Object.entries(supportCategoryLabels).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Filtrar</Button>
      </form>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {result.items.length ? (
          result.items.map((item) => (
            <Link
              key={item.id}
              href={`/super-admin/support/${item.id}`}
              className="grid gap-2 border-b p-4 transition-colors last:border-0 hover:bg-muted/40 md:grid-cols-[1fr_180px_150px] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.status === "NEW" ? (
                    <span>
                      <span className="sr-only">Solicitação nova</span>
                      <span
                        className="block size-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10"
                        aria-hidden="true"
                      />
                    </span>
                  ) : null}
                  <Badge variant={item.status === "NEW" ? "default" : "secondary"}>
                    {statusLabels[item.status]}
                  </Badge>
                  <Badge variant="outline">{supportCategoryLabels[item.category]}</Badge>
                  {item.notificationStatus === "FAILED" ? (
                    <Badge variant="destructive">
                      <AlertCircle /> E-mail falhou
                    </Badge>
                  ) : item.notificationStatus === "SENT" ? (
                    <Badge variant="outline">
                      <CheckCircle2 /> E-mail enviado
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 truncate font-medium">{item.subject}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {item.store.name} · {item.requesterName}
                </p>
              </div>
              <span className="truncate text-sm text-muted-foreground">
                <Mail className="mr-1 inline size-4" />
                {item.replyEmail}
              </span>
              <time className="text-sm text-muted-foreground md:text-right">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}
              </time>
            </Link>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{result.total} solicitações</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
            <Link href={url(result.page - 1)}>
              <ChevronLeft />
              Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={result.page >= result.totalPages}>
            <Link href={url(result.page + 1)}>
              Próxima
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
