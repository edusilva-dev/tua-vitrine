import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  ExternalLink,
  LifeBuoy,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminAuditActionLabels } from "../contracts/audit";
import type { PlatformStoreDetailDTO } from "../contracts/store-detail";
import { CopyValue } from "./copy-value";
import { OperationalActions } from "./operational-actions";
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
  MANUAL_GRANT: "Concessão temporária",
};
const subscriptionLabels = {
  INCOMPLETE: "Assinatura incompleta",
  INCOMPLETE_EXPIRED: "Assinatura expirada",
  TRIALING: "Assinatura em trial",
  ACTIVE: "Assinatura ativa",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Assinatura cancelada",
  UNPAID: "Assinatura não paga",
  PAUSED: "Assinatura pausada",
} as const;

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Não registrado";
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium sm:max-w-[65%] sm:text-right">{value}</dd>
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
              {store.status === "ACTIVE" ? "Loja publicada" : "Loja em rascunho"}
            </Badge>
            <Badge variant="outline">Plano {planLabels[store.plan.plan]}</Badge>
            {store.adminBlockedAt ? <Badge variant="destructive">Acesso bloqueado</Badge> : null}
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
              <DataRow
                label="ID da loja"
                value={<CopyValue label="Copiar ID da loja" value={store.id} />}
              />
              <DataRow
                label="Vitrine pública"
                value={store.status === "ACTIVE" ? "Publicada" : "Despublicada"}
              />
              <DataRow
                label="Acesso ao painel"
                value={store.adminBlockedAt ? "Bloqueado" : "Liberado"}
              />
              <DataRow label="Criada em" value={formatDate(store.createdAt)} />
              <DataRow label="Última atualização" value={formatDate(store.updatedAt)} />
              <DataRow
                label="Onboarding concluído"
                value={formatDate(store.onboardingCompletedAt)}
              />
            </dl>
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

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              Plano e cobrança
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-8 lg:grid-cols-2 lg:gap-0">
            <section className="lg:pr-8">
              <h3 className="text-sm font-medium text-muted-foreground">Acesso atual</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-heading text-2xl font-semibold">
                  Plano {planLabels[store.plan.plan]}
                </span>
                <Badge variant="outline">{sourceLabels[store.plan.source]}</Badge>
              </div>
              <dl className="mt-4">
                <DataRow label="Trial iniciado" value={formatDate(store.trialStartedAt)} />
                <DataRow label="Fim do trial" value={formatDate(store.plan.trialEndsAt)} />
                <DataRow
                  label="Pode iniciar um trial"
                  value={store.plan.trialAvailable ? "Sim" : "Não"}
                />
                {store.manualPlanGrant ? (
                  <DataRow
                    label="Concessão temporária até"
                    value={formatDate(store.manualPlanGrant.expiresAt)}
                  />
                ) : null}
              </dl>
            </section>

            <section className="border-t pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ReceiptText className="size-4" aria-hidden="true" />
                Registro da Stripe
              </h3>
              {store.subscription ? (
                <div className="mt-3 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {store.subscription.status
                        ? subscriptionLabels[store.subscription.status]
                        : "Assinatura sem status"}
                    </Badge>
                    {store.subscription.cancelAtPeriodEnd ? (
                      <Badge variant="secondary">Cancelamento agendado</Badge>
                    ) : null}
                  </div>
                  <dl>
                    <DataRow
                      label="Plano registrado"
                      value={
                        store.subscription.plan
                          ? `Plano ${planLabels[store.subscription.plan]}`
                          : "Ausente"
                      }
                    />
                    <DataRow
                      label="Fim do período"
                      value={formatDate(store.subscription.currentPeriodEnd)}
                    />
                    <DataRow
                      label="Atualizada em"
                      value={formatDate(store.subscription.updatedAt)}
                    />
                  </dl>
                  <dl>
                    <DataRow
                      label="ID do cliente Stripe"
                      value={
                        <CopyValue
                          label="Copiar ID do cliente Stripe"
                          value={store.subscription.stripeCustomerId}
                        />
                      }
                    />
                    {store.subscription.stripeSubscriptionId ? (
                      <DataRow
                        label="ID da assinatura Stripe"
                        value={
                          <CopyValue
                            label="Copiar ID da assinatura Stripe"
                            value={store.subscription.stripeSubscriptionId}
                          />
                        }
                      />
                    ) : null}
                  </dl>
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
                  <div className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">
                    Consulte a Stripe quando o acesso atual parecer diferente da assinatura, por
                    exemplo após um cancelamento ou pagamento cujo webhook não chegou.
                  </div>
                  <ReconcileBillingDialog storeId={store.id} storeName={store.name} />
                </div>
              ) : (
                <div className="mt-3 flex gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  <ReceiptText className="size-5 shrink-0" aria-hidden="true" />
                  Nenhuma assinatura Stripe registrada para esta loja.
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      </div>

      <OperationalActions
        store={{
          id: store.id,
          adminBlocked: Boolean(store.adminBlockedAt),
          published: store.status === "ACTIVE",
          trialActive: store.plan.source === "INTERNAL_TRIAL",
          ownerEmailVerified: owner?.emailVerified ?? true,
          manualGrant: store.manualPlanGrant
            ? { plan: store.manualPlanGrant.plan, expiresAt: store.manualPlanGrant.expiresAt }
            : null,
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <LifeBuoy className="size-5 text-primary" aria-hidden="true" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 className="font-heading font-semibold">Suporte recente</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/super-admin/support?storeId=${store.id}`}>Ver todos</Link>
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {store.recentSupportRequests.length ? (
              store.recentSupportRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/super-admin/support/${request.id}`}
                  className="block rounded-xl border p-3 transition-colors hover:bg-muted/40"
                >
                  <p className="truncate text-sm font-medium">{request.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.status === "NEW"
                      ? "Novo"
                      : request.status === "IN_PROGRESS"
                        ? "Em atendimento"
                        : "Resolvido"}{" "}
                    · {formatDate(request.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <Package className="size-5 text-primary" aria-hidden="true" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 className="font-heading font-semibold">Auditoria recente</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/super-admin/audit?storeId=${store.id}`}>Ver todos</Link>
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {store.recentAuditEvents.length ? (
              store.recentAuditEvents.map((event) => (
                <div key={event.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{adminAuditActionLabels[event.action]}</p>
                    <Badge variant={event.result === "SUCCESS" ? "secondary" : "destructive"}>
                      {event.result === "SUCCESS" ? "Sucesso" : "Falha"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {event.adminName} · {formatDate(event.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma ação administrativa registrada.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
