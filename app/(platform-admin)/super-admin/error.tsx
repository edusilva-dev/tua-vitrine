"use client";

import { Button } from "@/components/ui/button";

export default function PlatformAdminError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h1 className="font-heading text-xl font-semibold">Não foi possível carregar as lojas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente novamente. Se o problema continuar, confira a conexão com o banco.
      </p>
      <Button type="button" className="mt-5" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
