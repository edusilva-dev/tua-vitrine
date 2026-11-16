"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/http";
import type { SupportDetailDTO, SupportStatus } from "../contracts/support";

export function SupportDetailForm({ request }: { request: SupportDetailDTO }) {
  const router = useRouter();
  const [status, setStatus] = useState<SupportStatus>(request.status);
  const [note, setNote] = useState(request.internalNote ?? "");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      await api(`/api/super-admin/support/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          internalNote: note || null,
          reason,
          confirmed,
        }),
      });
      toast.success("Chamado atualizado.");
      setReason("");
      setConfirmed(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as SupportStatus)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">Novo</SelectItem>
            <SelectItem value="IN_PROGRESS">Em atendimento</SelectItem>
            <SelectItem value="RESOLVED">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="internal-note">Nota interna</Label>
        <Textarea
          id="internal-note"
          className="mt-2 min-h-32"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contexto curto para a equipe. O lojista não verá esta nota."
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/1000</p>
      </div>
      <div>
        <Label htmlFor="support-update-reason">Motivo da alteração</Label>
        <Textarea
          id="support-update-reason"
          className="mt-2"
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explique por que o tratamento está sendo alterado."
        />
      </div>
      <label
        htmlFor="confirm-support-update"
        className="flex items-start gap-3 rounded-xl border p-3 text-sm"
      >
        <Checkbox
          id="confirm-support-update"
          checked={confirmed}
          onCheckedChange={(value) => setConfirmed(value === true)}
        />
        <span>Confirmo o estado, a nota interna e o motivo desta alteração</span>
      </label>
      <Button onClick={save} disabled={saving || !confirmed || reason.trim().length < 10}>
        {saving ? "Salvando..." : "Salvar tratamento"}
      </Button>
    </div>
  );
}
