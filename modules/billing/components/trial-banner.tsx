"use client";

import { ArrowRight, Clock3, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/http";
import type { Entitlements } from "../contracts";

function deadline(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function TrialBanner({ entitlements }: { entitlements: Entitlements }) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  async function activate() {
    setActivating(true);

    try {
      await api<{ activated: true }>("/api/billing/trial", { method: "POST" });
      toast.success("Trial Profissional ativado por 14 dias.");
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível ativar o trial.");
    } finally {
      setActivating(false);
    }
  }

  if (entitlements.source === "INTERNAL_TRIAL" && entitlements.trialEndsAt)
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Clock3 size={20} />
          </span>
          <div>
            <p className="font-heading font-semibold">Seu trial Profissional está ativo</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Você tem {entitlements.trialDaysRemaining}{" "}
              {entitlements.trialDaysRemaining === 1 ? "dia restante" : "dias restantes"}. O teste
              termina em {deadline(entitlements.trialEndsAt)}.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0 bg-background">
          <Link href="/admin/billing">
            Ver planos <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    );

  if (!entitlements.trialAvailable) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[#c8ddb0] bg-[#eef6e5] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#183c3d] text-white">
          <Sparkles size={20} />
        </span>
        <div>
          <p className="font-heading font-semibold">Experimente o plano Profissional</p>
          <p className="mt-1 text-sm leading-relaxed text-[#526a62]">
            Ative quando quiser e use todos os recursos por 14 dias. Não precisa de cartão.
          </p>
        </div>
      </div>
      <Button disabled={activating} onClick={() => void activate()} className="shrink-0">
        {activating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
        Ativar trial de 14 dias
      </Button>
    </section>
  );
}
