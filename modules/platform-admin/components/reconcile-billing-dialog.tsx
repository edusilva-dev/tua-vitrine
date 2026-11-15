"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/http";

export function ReconcileBillingDialog({
  storeId,
  storeName,
}: {
  storeId: string;
  storeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function reconcile() {
    setBusy(true);
    setError(undefined);

    try {
      await api(`/api/super-admin/stores/${storeId}/billing/reconcile`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reconciliar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <RefreshCw aria-hidden="true" />
          Consultar Stripe e atualizar dados
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconciliar assinatura?</DialogTitle>
          <DialogDescription>
            Esta ação compara a assinatura salva no Tua Vitrine com a assinatura atual na Stripe. Se
            houver diferença, os dados locais de {storeName} serão corrigidos pela mesma regra usada
            nos webhooks. Nenhuma cobrança será criada, cancelada ou reembolsada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reconcile-reason">Motivo da reconciliação</Label>
          <Textarea
            id="reconcile-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={500}
            placeholder="Ex.: webhook atrasado após cancelamento solicitado pelo lojista"
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={reconcile} disabled={busy || reason.trim().length < 10}>
            {busy ? "Consultando Stripe..." : "Comparar e atualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
