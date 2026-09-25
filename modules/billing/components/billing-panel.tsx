"use client";

import { Check, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/http";
import type { BillingPlan, Entitlements, PaidBillingPlan } from "../contracts";

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
  const [loading, setLoading] = useState<PaidBillingPlan | "PORTAL" | null>(null);
  const isTrial = status.entitlements.source === "INTERNAL_TRIAL" || status.status === "TRIALING";
  const trialDays =
    status.entitlements.source === "INTERNAL_TRIAL"
      ? status.entitlements.trialDaysRemaining
      : trialDaysRemaining(status.trialEnd);
  const periodEnd = formatDate(status.currentPeriodEnd);

  async function open(path: string, plan?: PaidBillingPlan) {
    setLoading(plan ?? "PORTAL");

    try {
      const result = await api<{ url: string }>(path, {
        method: "POST",
        ...(plan ? { body: JSON.stringify({ plan }) } : {}),
      });

      window.location.assign(result.url);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível abrir a cobrança.");
      setLoading(null);
    }
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
                {statusNames[status.status] ?? status.status.toLowerCase().replaceAll("_", " ")}
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
        ) : periodEnd ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">
              {status.cancelAtPeriodEnd ? "Acesso disponível até" : "Próxima renovação"}
            </p>
            <p className="mt-1 text-muted-foreground">{periodEnd}</p>
            {status.cancelAtPeriodEnd ? (
              <p className="mt-2 text-amber-700">
                O cancelamento está agendado. Você pode reativar a assinatura pelo portal antes
                dessa data.
              </p>
            ) : null}
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

        <div className="mt-5 flex flex-wrap gap-3">
          {status.canSubscribe && (
            <>
              <Button
                disabled={!status.enabled || loading !== null}
                onClick={() => void open("/api/billing/checkout", "ESSENTIAL")}
              >
                {loading === "ESSENTIAL" && <Loader2 className="animate-spin" />}
                Assinar Essencial
              </Button>
              <Button
                variant="outline"
                disabled={!status.enabled || loading !== null}
                onClick={() => void open("/api/billing/checkout", "PROFESSIONAL")}
              >
                {loading === "PROFESSIONAL" && <Loader2 className="animate-spin" />}
                Assinar Profissional
              </Button>
            </>
          )}
          {status.canManage && (
            <Button
              disabled={!status.enabled || loading !== null}
              onClick={() => void open("/api/billing/portal")}
            >
              {loading === "PORTAL" && <Loader2 className="animate-spin" />}
              Trocar, renovar ou cancelar
            </Button>
          )}
        </div>

        {status.canManage ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            A troca de plano, a atualização da forma de pagamento e o cancelamento são feitos no
            portal seguro da Stripe.
          </p>
        ) : null}
        {status.canSubscribe ? (
          <ul className="mt-6 grid gap-2 border-t pt-5 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-primary" /> Essencial: até 50 produtos
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-primary" /> Profissional: catálogo completo
            </li>
          </ul>
        ) : null}
      </div>
    </section>
  );
}
