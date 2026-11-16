"use client";

import { Ban, CircleStop, Gift, MailCheck, Radio, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/client/http";

type SimpleAction = {
  key: string;
  title: string;
  description: string;
  button: string;
  endpoint: string;
  confirm: string;
  icon: typeof Ban;
  destructive?: boolean;
  disabled?: boolean;
};

export function OperationalActions({
  store,
}: {
  store: {
    id: string;
    adminBlocked: boolean;
    published: boolean;
    trialActive: boolean;
    ownerEmailVerified: boolean;
    manualGrant: { plan: "ESSENTIAL" | "PROFESSIONAL"; expiresAt: string } | null;
  };
}) {
  const actions: SimpleAction[] = [
    store.adminBlocked
      ? {
          key: "unblock",
          title: "Reativar acesso administrativo",
          description:
            "O lojista voltará a acessar o painel. A vitrine e a cobrança não serão alteradas.",
          button: "Reativar painel",
          endpoint: "unblock",
          confirm: "Confirmo que desejo reativar o painel",
          icon: ShieldCheck,
        }
      : {
          key: "block",
          title: "Bloquear acesso administrativo",
          description:
            "O lojista perderá acesso ao painel, mas catálogo, vitrine, assinatura e histórico serão preservados.",
          button: "Bloquear painel",
          endpoint: "block",
          confirm: "Confirmo que desejo bloquear o painel",
          icon: Ban,
          destructive: true,
        },
    store.published
      ? {
          key: "unpublish",
          title: "Despublicar vitrine",
          description:
            "A vitrine pública deixará de abrir. O lojista continuará com acesso ao painel e à assinatura.",
          button: "Despublicar vitrine",
          endpoint: "unpublish",
          confirm: "Confirmo que desejo retirar a vitrine do ar",
          icon: Radio,
          destructive: true,
        }
      : {
          key: "publish",
          title: "Republicar vitrine",
          description:
            "A vitrine voltará a ficar disponível publicamente sem alterar catálogo ou cobrança.",
          button: "Republicar vitrine",
          endpoint: "publish",
          confirm: "Confirmo que desejo publicar a vitrine",
          icon: Radio,
        },
    {
      key: "trial",
      title: "Encerrar trial",
      description:
        "Encerra imediatamente o trial interno. Uma assinatura Stripe ou concessão ativa continua independente.",
      button: "Encerrar trial",
      endpoint: "end-trial",
      confirm: "Confirmo que desejo encerrar o trial agora",
      icon: CircleStop,
      destructive: true,
      disabled: !store.trialActive,
    },
    {
      key: "verification",
      title: "Reenviar confirmação de e-mail",
      description:
        "Envia uma nova confirmação ao e-mail do proprietário pelo fluxo oficial de autenticação.",
      button: "Reenviar confirmação",
      endpoint: "resend-verification",
      confirm: "Confirmo o reenvio ao proprietário desta loja",
      icon: MailCheck,
      disabled: store.ownerEmailVerified,
    },
  ];

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="font-heading font-semibold">Ações operacionais</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada ação exige confirmação e deixa um registro de auditoria.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <ActionDialog key={action.key} storeId={store.id} action={action} />
        ))}
        <GrantDialog storeId={store.id} current={store.manualGrant} />
      </div>
    </section>
  );
}

function ActionDialog({ storeId, action }: { storeId: string; action: SimpleAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const Icon = action.icon;

  async function submit() {
    setLoading(true);

    try {
      await api(`/api/super-admin/stores/${storeId}/actions/${action.endpoint}`, {
        method: "POST",
        body: JSON.stringify({ reason, confirmed }),
      });
      toast.success("Ação concluída.");
      setOpen(false);
      setReason("");
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={action.destructive ? "destructive" : "outline"}
          className="h-auto min-h-11 justify-start whitespace-normal"
          disabled={action.disabled}
        >
          <Icon />
          {action.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`reason-${action.key}`}>Motivo</Label>
            <Textarea
              id={`reason-${action.key}`}
              className="mt-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Explique por que esta ação é necessária."
            />
          </div>
          <label
            htmlFor={`confirm-${action.key}`}
            className="flex items-start gap-3 rounded-xl border p-3 text-sm"
          >
            <Checkbox
              id={`confirm-${action.key}`}
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            <span>{action.confirm}</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant={action.destructive ? "destructive" : "default"}
            onClick={submit}
            disabled={loading || !confirmed || reason.trim().length < 10}
          >
            {loading ? "Processando..." : action.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GrantDialog({
  storeId,
  current,
}: {
  storeId: string;
  current: { plan: "ESSENTIAL" | "PROFESSIONAL"; expiresAt: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"ESSENTIAL" | "PROFESSIONAL">(current?.plan ?? "ESSENTIAL");
  const [expiresAt, setExpiresAt] = useState(current?.expiresAt.slice(0, 10) ?? "");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    try {
      await api(`/api/super-admin/stores/${storeId}/actions/manual-grant`, {
        method: "POST",
        body: JSON.stringify({
          plan,
          expiresAt: new Date(`${expiresAt}T23:59:59.999-03:00`).toISOString(),
          reason,
          confirmed,
        }),
      });
      toast.success("Concessão temporária salva.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível salvar a concessão."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-auto min-h-11 justify-start">
          <Gift />
          {current ? "Alterar concessão" : "Conceder plano temporário"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concessão temporária de plano</DialogTitle>
          <DialogDescription>
            Libera recursos sem criar ou modificar uma assinatura na Stripe. O acesso expira
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Plano</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as typeof plan)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESSENTIAL">Essencial</SelectItem>
                <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="grant-expiration">Expira em</Label>
            <Input
              id="grant-expiration"
              type="date"
              className="mt-2"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="grant-reason">Motivo</Label>
            <Textarea
              id="grant-reason"
              className="mt-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <label
            htmlFor="confirm-manual-grant"
            className="flex items-start gap-3 rounded-xl border p-3 text-sm"
          >
            <Checkbox
              id="confirm-manual-grant"
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            <span>Confirmo o plano, a validade e o motivo desta concessão</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={loading || !confirmed || !expiresAt || reason.trim().length < 10}
          >
            {loading ? "Salvando..." : "Salvar concessão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
