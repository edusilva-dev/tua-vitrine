"use client";

import { Loader2 } from "lucide-react";
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

function trialDaysRemaining(trialEnd: string | null) {
  if (!trialEnd) return null;

  const remaining = new Date(trialEnd).getTime() - Date.now();

  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

export function BillingPanel({ status }: { status: BillingStatus }) {
  const [loading, setLoading] = useState<PaidBillingPlan | "PORTAL" | null>(null);
  const isTrial = status.entitlements.source === "INTERNAL_TRIAL" || status.status === "TRIALING";
  const trialDays =
    status.entitlements.source === "INTERNAL_TRIAL"
      ? status.entitlements.trialDaysRemaining
      : trialDaysRemaining(status.trialEnd);

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
    <section className="rounded-xl border bg-card p-6">
      <p className="eyebrow">ASSINATURA</p>
      <h2 className="mt-1 font-semibold">Plano da sua vitrine</h2>
      {isTrial ? (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Trial Profissional</p>
          <p className="mt-1 text-muted-foreground">
            {trialDays === 0
              ? "Seu período de teste termina hoje."
              : `${trialDays ?? 14} ${trialDays === 1 ? "dia restante" : "dias restantes"}.`}
          </p>
        </div>
      ) : status.status ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {planNames[status.entitlements.plan]} · {status.status.toLowerCase().replaceAll("_", " ")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
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
            Gerenciar assinatura
          </Button>
        )}
      </div>
    </section>
  );
}
