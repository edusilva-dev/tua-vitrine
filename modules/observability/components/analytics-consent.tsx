"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsConsentState } from "../client/consent";
import {
  acceptAnalyticsConsent,
  rejectAnalyticsConsent,
  restoreAnalyticsConsent,
} from "../client/posthog-consent";

export function AnalyticsConsent() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [consent, setConsent] = useState<AnalyticsConsentState | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    try {
      setConsent(restoreAnalyticsConsent());
    } catch {
      setConsent("unknown");
    }
  }, [isAdmin]);

  function accept() {
    acceptAnalyticsConsent();
    setConsent("accepted");
    setPreferencesOpen(false);
  }

  function reject() {
    rejectAnalyticsConsent();
    setConsent("rejected");
    setPreferencesOpen(false);
  }

  if (!isAdmin || !consent) return null;

  return (
    <>
      {consent === "unknown" ? (
        <section
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-3xl border border-foreground/10 bg-background p-5 shadow-2xl sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-ink-green">
              <ShieldCheck aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 id="analytics-consent-title" className="font-heading text-base font-semibold">
                Você escolhe sobre as métricas
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Podemos usar métricas para entender o que funciona e melhorar a Tua Vitrine. Você
                pode aceitar ou recusar sem alterar o funcionamento do app. Saiba mais na nossa{" "}
                <Link
                  className="font-medium text-foreground underline underline-offset-4"
                  href="/privacidade?retorno=/admin"
                >
                  política de privacidade
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button className="h-11 w-full" variant="outline" onClick={reject}>
              Recusar métricas
            </Button>
            <Button className="h-11 w-full" onClick={accept}>
              Aceitar métricas
            </Button>
          </div>
        </section>
      ) : (
        <Button
          aria-label="Revisar preferências de privacidade"
          className="fixed bottom-4 left-4 z-30 bg-background shadow-lg hover:bg-muted"
          size="sm"
          variant="outline"
          onClick={() => setPreferencesOpen(true)}
        >
          <ShieldCheck aria-hidden="true" />
          Privacidade
        </Button>
      )}

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de privacidade</DialogTitle>
            <DialogDescription>
              As métricas estão {consent === "accepted" ? "permitidas" : "recusadas"}. Você pode
              mudar essa escolha quando quiser. Veja os detalhes na{" "}
              <Link href="/privacidade?retorno=/admin">política de privacidade</Link>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid sm:grid-cols-2">
            <Button className="h-11 w-full" variant="outline" onClick={reject}>
              Recusar métricas
            </Button>
            <Button className="h-11 w-full" onClick={accept}>
              Aceitar métricas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
