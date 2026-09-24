"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/http";
import type { BillingPlan } from "../contracts";

type BillingStatus = {
  enabled: boolean;
  plan: BillingPlan | null;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canManage: boolean;
  canSubscribe: boolean;
};

const planNames: Record<BillingPlan, string> = { BASIC: "Essencial", PRO: "Profissional" };

export function BillingPanel({ status }: { status: BillingStatus }) {
  const [loading, setLoading] = useState<BillingPlan | "PORTAL" | null>(null);

  async function open(path: string, plan?: BillingPlan) {
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
      {status.plan && status.status ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {planNames[status.plan]} · {status.status.toLowerCase().replaceAll("_", " ")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha um plano e experimente por 14 dias.
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
              onClick={() => void open("/api/billing/checkout", "BASIC")}
            >
              {loading === "BASIC" && <Loader2 className="animate-spin" />}
              Assinar Essencial
            </Button>
            <Button
              variant="outline"
              disabled={!status.enabled || loading !== null}
              onClick={() => void open("/api/billing/checkout", "PRO")}
            >
              {loading === "PRO" && <Loader2 className="animate-spin" />}
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
