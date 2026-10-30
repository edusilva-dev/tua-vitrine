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

  const choices = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button
        type="button"
        variant="outline"
        disabled={consent.revision === 0}
        onClick={() => choose("accepted")}
      >
        Aceitar análises
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={consent.revision === 0}
        onClick={() => choose("rejected")}
      >
        Rejeitar análises
      </Button>
    </div>
  );

  if (placement === "banner") {
    if (consent.status !== "unknown") return null;

    return (
      <section
        aria-labelledby="analytics-consent-title"
        className="analytics-consent border-b border-border bg-muted px-4 py-4 text-foreground"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <h2 id="analytics-consent-title" className="font-heading text-base font-semibold">
            Sua escolha de privacidade
          </h2>
          <p className="text-sm text-muted-foreground">
            Análises opcionais com PostHog ajudam a melhorar o produto. Você pode aceitar ou
            rejeitar e mudar a escolha no rodapé. O uso da loja continua disponível.
          </p>
          <Link href="/privacidade/cookies" className="w-fit text-sm underline underline-offset-4">
            Detalhes de privacidade e cookies
          </Link>
          <div className="max-w-md">{choices}</div>
        </div>
      </section>
    );
  }

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
              Análises com PostHog são opcionais. Rejeitar também revoga uma aceitação anterior,
              interrompe a captura e limpa os identificadores analíticos deste navegador.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm" role="status">
            Escolha atual: {consent.status === "accepted" ? "aceita" : ""}
            {consent.status === "rejected" ? "rejeitada" : ""}
            {consent.status === "unknown" ? "ainda não definida" : ""}.
          </p>
          <Link href="/privacidade/cookies" className="text-sm underline underline-offset-4">
            Detalhes de privacidade e cookies
          </Link>
          {choices}
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
