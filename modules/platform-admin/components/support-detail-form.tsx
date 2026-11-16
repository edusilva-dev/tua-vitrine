"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      await api(`/api/super-admin/support/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, internalNote: note || null }),
      });
      toast.success("Chamado atualizado.");
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
      <Button onClick={save} disabled={saving}>
        {saving ? "Salvando..." : "Salvar tratamento"}
      </Button>
    </div>
  );
}
