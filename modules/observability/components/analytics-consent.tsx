"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { browserAnalyticsConsent } from "@/modules/observability/client/browser-consent";
import { unknownAnalyticsConsent } from "@/modules/observability/client/consent";

export function AnalyticsConsent({ placement }: { placement: "banner" | "settings" }) {
  const consent = useSyncExternalStore(
    browserAnalyticsConsent.subscribe,
    browserAnalyticsConsent.getSnapshot,
    () => unknownAnalyticsConsent
  );
  const [open, setOpen] = useState(false);

  function choose(status: "accepted" | "rejected") {
    browserAnalyticsConsent.choose(status);
    setOpen(false);
  }

  if (placement === "banner") {
    if (consent.status !== "unknown") return null;

    return (
      <section
        aria-labelledby="analytics-consent-title"
        className="analytics-consent-banner fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-xl sm:p-5"
      >
        <div className="flex flex-col gap-3">
          <h2 id="analytics-consent-title" className="font-heading text-base font-semibold">
            Sua escolha de privacidade
          </h2>
          <p className="text-sm text-muted-foreground">
            Análises opcionais com PostHog ajudam a melhorar o produto. Ao concordar, você autoriza
            a captura neste navegador. Pode continuar usando a loja sem concordar e revogar depois
            nas preferências de privacidade.
          </p>
          <Link href="/privacidade/cookies" className="w-fit text-sm underline underline-offset-4">
            Detalhes de privacidade e cookies
          </Link>
          <Button
            type="button"
            className="w-full sm:w-fit"
            disabled={consent.revision === 0}
            onClick={() => choose("accepted")}
          >
            Eu concordo
          </Button>
        </div>
      </section>
    );
  }

  if (consent.status === "unknown") return null;

  return (
    <footer className="analytics-consent border-t border-border bg-background px-4 py-4 text-center text-foreground">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="link" disabled={consent.revision === 0}>
            Preferências de privacidade
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de privacidade</DialogTitle>
            <DialogDescription>
              Análises com PostHog são opcionais. Você pode continuar usando a loja sem concordar.
              Revogar interrompe a captura e limpa os identificadores analíticos deste navegador.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm" role="status">
            Escolha atual: {consent.status === "accepted" ? "aceita" : "rejeitada"}.
          </p>
          <Link href="/privacidade/cookies" className="text-sm underline underline-offset-4">
            Detalhes de privacidade e cookies
          </Link>
          {consent.status === "accepted" ? (
            <Button type="button" variant="outline" onClick={() => choose("rejected")}>
              Revogar consentimento
            </Button>
          ) : (
            <Button
              type="button"
              disabled={consent.revision === 0}
              onClick={() => choose("accepted")}
            >
              Eu concordo
            </Button>
          )}
        </DialogContent>
      </Dialog>
      {!consent.persisted && (
        <p role="status" className="mx-auto max-w-md text-sm text-muted-foreground">
          Não foi possível salvar a preferência. Sua escolha vale nesta aba; ela poderá ser
          solicitada novamente ao abrir a página.
        </p>
      )}
    </footer>
  );
}
