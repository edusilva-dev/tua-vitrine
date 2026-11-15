import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  ExternalLink,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformStoreDetailDTO } from "../contracts/store-detail";
import { CopyValue } from "./copy-value";
import { ReconcileBillingDialog } from "./reconcile-billing-dialog";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const planLabels = { FREE: "Free", ESSENTIAL: "Essencial", PROFESSIONAL: "Profissional" };
const sourceLabels = {
  FREE: "Plano gratuito",
  INTERNAL_TRIAL: "Trial interno",
  SUBSCRIPTION: "Assinatura Stripe",
};
const subscriptionLabels = {
  INCOMPLETE: "Incompleta",
  INCOMPLETE_EXPIRED: "Incompleta expirada",
  TRIALING: "Em trial",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Cancelada",
  UNPAID: "Não paga",
  PAUSED: "Pausada",
} as const;

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Não registrado";
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value}</dd>
    </div>
  );
}

export function PlatformStoreDetail({ store }: { store: PlatformStoreDetailDTO }) {
  const owner = store.members.find((member) => member.role === "OWNER") ?? null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/super-admin">
          <ArrowLeft aria-hidden="true" />
          Voltar para lojas
        </Link>
      </Button>

      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={store.status === "ACTIVE" ? "default" : "secondary"}>
              {store.status === "ACTIVE" ? "Loja ativa" : "Rascunho"}
            </Badge>
            <Badge variant="outline">{planLabels[store.plan.plan]}</Badge>
          </div>
          <h1 className="mt-4 break-words font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {store.name}
          </h1>
          <p className="mt-1 break-all text-sm text-muted-foreground">/{store.slug}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={store.publicUrl} target="_blank">
            Abrir vitrine <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Publicados", store.products.published],
          ["Não publicados", store.products.unpublished],
          ["Arquivados", store.products.archived],
          ["Total histórico", store.products.total],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Estado operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DataRow label="ID da loja" value={store.id} />
              <DataRow label="Criada em" value={formatDate(store.createdAt)} />
              <DataRow label="Última atualização" value={formatDate(store.updatedAt)} />
              <DataRow
                label="Onboarding concluído"
                value={formatDate(store.onboardingCompletedAt)}
              />
            </dl>
            <div className="mt-3">
              <CopyValue label="Copiar ID da loja" value={store.id} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden="true" />
              Pessoas vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {store.members.length ? (
              store.members.map((member) => (
                <article key={member.userId} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{member.name}</p>
                      <p className="break-all text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="outline">
                      {member.role === "OWNER" ? "Proprietário" : member.role}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {member.emailVerified ? "E-mail verificado" : "E-mail não verificado"} · desde{" "}
                    {formatDate(member.joinedAt)}
                  </p>
                </article>
              ))
            ) : (
              <div className="flex gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <CircleAlert className="size-5 shrink-0" aria-hidden="true" />A loja não possui
                pessoas vinculadas. Esse estado exige investigação.
              </div>
            )}
            {!owner && store.members.length > 0 ? (
              <p className="text-sm text-amber-700">Nenhum proprietário foi identificado.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              Plano efetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-2xl font-semibold">
                {planLabels[store.plan.plan]}
              </span>
              <Badge variant="outline">{sourceLabels[store.plan.source]}</Badge>
            </div>
            <dl className="mt-4">
              <DataRow label="Trial iniciado" value={formatDate(store.trialStartedAt)} />
              <DataRow label="Fim do trial efetivo" value={formatDate(store.plan.trialEndsAt)} />
              <DataRow label="Trial disponível" value={store.plan.trialAvailable ? "Sim" : "Não"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-primary" aria-hidden="true" />
              Assinatura local
            </CardTitle>
          </CardHeader>
          <CardContent>
            {store.subscription ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {store.subscription.status
                      ? subscriptionLabels[store.subscription.status]
                      : "Sem status"}
                  </Badge>
                  {store.subscription.cancelAtPeriodEnd ? (
                    <Badge variant="secondary">Cancelamento agendado</Badge>
                  ) : null}
                </div>
                <dl>
                  <DataRow
                    label="Plano registrado"
                    value={
                      store.subscription.plan ? planLabels[store.subscription.plan] : "Ausente"
                    }
                  />
                  <DataRow
                    label="Fim do período"
                    value={formatDate(store.subscription.currentPeriodEnd)}
                  />
                  <DataRow label="Atualizada em" value={formatDate(store.subscription.updatedAt)} />
                </dl>
                <div className="space-y-2">
                  <CopyValue
                    label="Copiar ID do cliente Stripe"
                    value={store.subscription.stripeCustomerId}
                  />
                  {store.subscription.stripeSubscriptionId ? (
                    <CopyValue
                      label="Copiar ID da assinatura Stripe"
                      value={store.subscription.stripeSubscriptionId}
                    />
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={store.subscription.customerDashboardUrl} target="_blank">
                      Cliente na Stripe <ExternalLink aria-hidden="true" />
                    </Link>
                  </Button>
                  {store.subscription.subscriptionDashboardUrl ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={store.subscription.subscriptionDashboardUrl} target="_blank">
                        Assinatura na Stripe <ExternalLink aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  {store.lastStripeWebhook ? (
                    <>
                      Último webhook:{" "}
                      <span className="font-medium text-foreground">
                        {store.lastStripeWebhook.type}
                      </span>
                      {" · "}
                      {formatDate(store.lastStripeWebhook.processedAt)}
                    </>
                  ) : (
                    "Nenhum webhook relacionado foi registrado. Eventos anteriores a esta versão não possuem vínculo retroativo."
                  )}
                </div>
                <ReconcileBillingDialog storeId={store.id} storeName={store.name} />
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <ReceiptText className="size-5 shrink-0" aria-hidden="true" />
                Nenhuma assinatura Stripe registrada para esta loja.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Suporte recente", "Os chamados aparecerão aqui após a tarefa de suporte persistido."],
          [
            "Auditoria recente",
            "As ações administrativas aparecerão aqui após a trilha de auditoria.",
          ],
        ].map(([title, description]) => (
          <section key={title} className="rounded-2xl border border-dashed bg-card/50 p-5">
            <Package className="size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 font-heading font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
