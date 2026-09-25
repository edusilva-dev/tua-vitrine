"use client";

import { Check, CreditCard, Info, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/http";
import { type BillingPlan, billingPlans, type Entitlements } from "../contracts";

type BillingStatus = {
  entitlements: Entitlements;
  enabled: boolean;
  plan: BillingPlan | null;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canManage: boolean;
  canSubscribe: boolean;
};

const planNames: Record<BillingPlan, string> = {
  FREE: "Free",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
};

const planDetails: Record<BillingPlan, { description: string; features: string[] }> = {
  FREE: {
    description: "Para conhecer a plataforma e manter uma vitrine enxuta.",
    features: ["Até 10 produtos", "Logo da loja", "Métricas dos últimos 7 dias"],
  },
  ESSENTIAL: {
    description: "Para lojas que precisam ganhar tempo e acompanhar resultados.",
    features: ["Até 50 produtos", "Importação por planilha", "Cores, logo e métricas completas"],
  },
  PROFESSIONAL: {
    description: "Para catálogos maiores e campanhas promocionais.",
    features: ["Até 1.000 produtos", "Personalização completa", "Campanhas promocionais"],
  },
};

const planRank: Record<BillingPlan, number> = { FREE: 0, ESSENTIAL: 1, PROFESSIONAL: 2 };

const statusNames: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIALING: "Em período de teste",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  UNPAID: "Pagamento necessário",
  INCOMPLETE: "Pagamento incompleto",
  INCOMPLETE_EXPIRED: "Pagamento expirado",
  PAUSED: "Pausada",
};

function trialDaysRemaining(trialEnd: string | null) {
  if (!trialEnd) return null;

  const remaining = new Date(trialEnd).getTime() - Date.now();

  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function BillingPanel({ status }: { status: BillingStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState<BillingPlan | "PORTAL" | null>(null);
  const [portalWarningOpen, setPortalWarningOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<BillingPlan | null>(null);
  const isTrial = status.entitlements.source === "INTERNAL_TRIAL" || status.status === "TRIALING";
  const trialDays =
    status.entitlements.source === "INTERNAL_TRIAL"
      ? status.entitlements.trialDaysRemaining
      : trialDaysRemaining(status.trialEnd);
  const periodEnd = formatDate(status.currentPeriodEnd);

  async function open(path: string, plan?: BillingPlan) {
    setLoading(plan ?? "PORTAL");

    try {
      const result = await api<{ url: string | null }>(path, {
        method: "POST",
        body: JSON.stringify(plan ? { plan } : {}),
      });

      if (result.url) {
        window.location.assign(result.url);

        return;
      }

      toast.success("Plano Free ativado.");
      setLoading(null);
      setPortalWarningOpen(false);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível abrir a cobrança.");
      setLoading(null);
    }
  }

  function choosePlan(plan: BillingPlan) {
    if (plan === status.entitlements.plan && !status.cancelAtPeriodEnd) return;

    if (plan === status.entitlements.plan && status.cancelAtPeriodEnd) {
      void open("/api/billing/portal");

      return;
    }

    if (planRank[plan] < planRank[status.entitlements.plan]) {
      setPendingPlan(plan);
      setPortalWarningOpen(true);

      return;
    }

    void open("/api/billing/change-plan", plan);
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-5 border-b p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{planNames[status.entitlements.plan]}</h2>
            {status.status ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {status.cancelAtPeriodEnd
                  ? "Cancelamento agendado"
                  : (statusNames[status.status] ??
                    status.status.toLowerCase().replaceAll("_", " "))}
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <CreditCard size={21} />
        </div>
      </div>
      <div className="p-6">
        {isTrial ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Trial Profissional</p>
            <p className="mt-1 text-muted-foreground">
              {trialDays === 0
                ? "Seu período de teste termina hoje."
                : `${trialDays ?? 14} ${trialDays === 1 ? "dia restante" : "dias restantes"}.`}
            </p>
          </div>
        ) : status.status === "CANCELED" || status.status === "INCOMPLETE_EXPIRED" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Plano pago encerrado</p>
            <p className="mt-1 text-amber-800">
              {periodEnd
                ? `A assinatura foi encerrada em ${periodEnd}. Sua loja agora usa o plano Free.`
                : "A assinatura foi encerrada. Sua loja agora usa o plano Free."}
            </p>
          </div>
        ) : status.cancelAtPeriodEnd && periodEnd ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Cancelamento agendado</p>
            <p className="mt-1 text-amber-800">
              Seu plano atual permanece vigente somente até {periodEnd}. Depois dessa data, sua loja
              passa para o plano Free.
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Você pode reativar a assinatura pelo portal antes dessa data.
            </p>
          </div>
        ) : periodEnd ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Próxima renovação</p>
            <p className="mt-1 text-muted-foreground">{periodEnd}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você está no plano Free. Assine quando precisar de mais produtos e recursos.
          </p>
        )}

        {!status.enabled && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            As assinaturas estarão disponíveis em breve.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {(Object.keys(planDetails) as BillingPlan[]).map((plan) => {
            const current = plan === status.entitlements.plan;
            const price = billingPlans[plan].amountCents;

            return (
              <article
                key={plan}
                className={`flex flex-col rounded-xl border p-5 ${current ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "bg-background"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{planNames[plan]}</h3>
                    <p className="mt-1 text-2xl font-semibold">
                      {price ? `R$ ${(price / 100).toFixed(0)}` : "Grátis"}
                      {price ? (
                        <span className="text-xs font-normal text-muted-foreground">/mês</span>
                      ) : null}
                    </p>
                  </div>
                  {current ? (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                      PLANO ATUAL
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {planDetails[plan].description}
                </p>
                <ul className="my-5 grid gap-2 text-xs">
                  {planDetails[plan].features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto w-full"
                  variant={current ? "secondary" : plan === "PROFESSIONAL" ? "default" : "outline"}
                  disabled={
                    !status.enabled || loading !== null || (current && !status.cancelAtPeriodEnd)
                  }
                  onClick={() => choosePlan(plan)}
                >
                  {loading === plan ? <Loader2 className="animate-spin" /> : null}
                  {current
                    ? status.cancelAtPeriodEnd
                      ? "Reativar assinatura"
                      : "Plano atual"
                    : planRank[plan] > planRank[status.entitlements.plan]
                      ? "Fazer upgrade"
                      : "Mudar para este plano"}
                </Button>
              </article>
            );
          })}
        </div>

        {status.canManage ? (
          <div className="mt-5 space-y-4 border-t pt-5">
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">
              <Info className="mt-0.5 size-4 shrink-0 text-blue-700" />
              <p>
                <strong>Por que o Free não aparece na Stripe?</strong> Como ele não possui cobrança,
                não é exibido entre as assinaturas pagas. Para mudar para o Free, use o card acima;
                sua cobrança será cancelada e o acesso pago continuará até o fim do período atual.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Faturas e forma de pagamento ficam no portal seguro da Stripe.
              </p>
              <Button
                variant="ghost"
                disabled={!status.enabled || loading !== null}
                onClick={() => void open("/api/billing/portal")}
              >
                {loading === "PORTAL" ? <Loader2 className="animate-spin" /> : null}
                Faturas e forma de pagamento
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <AlertDialog open={portalWarningOpen} onOpenChange={setPortalWarningOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-xl">
          <AlertDialogHeader>
            <div className="mb-3 grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
              <TriangleAlert className="size-6" />
            </div>
            <AlertDialogTitle className="text-xl">
              Reduzir o plano altera sua vitrine
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              A Stripe mostrará as opções de troca, renovação e cancelamento. Se você confirmar um
              downgrade, os recursos que não pertencem ao novo plano serão removidos quando a
              mudança entrar em vigor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>
              <strong>Profissional para Essencial:</strong> modelo da vitrine, frase personalizada e
              campanha promocional serão resetados.
            </p>
            <p>
              <strong>Essencial ou Profissional para Free:</strong> a cor também volta ao padrão e
              somente 10 produtos poderão permanecer publicados.
            </p>
            <p>
              Um cancelamento agendado mantém os recursos atuais até o final do período já pago.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter meu plano</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPlan) void open("/api/billing/change-plan", pendingPlan);
              }}
              disabled={loading !== null}
            >
              Entendi, continuar com o downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
