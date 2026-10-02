"use client";

import { Loader2, Send } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
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
import { ApiError, api } from "@/lib/client/http";
import {
  type StorefrontFeedbackInput,
  storefrontFeedbackKindLabels,
  storefrontFeedbackSchema,
} from "../contracts";
import { RatingField } from "./rating-field";

export function StorefrontFeedbackDialog({
  slug,
  context,
  trigger,
  initialKind = "FOUND",
}: {
  slug: string;
  context: StorefrontFeedbackInput["context"];
  trigger: ReactNode;
  initialKind?: StorefrontFeedbackInput["kind"];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<StorefrontFeedbackInput["kind"] | null>(initialKind ?? null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = storefrontFeedbackSchema.safeParse({ kind, rating, message, context });

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);

      return;
    }

    setSending(true);
    setErrors({});

    try {
      await api<{ saved: true }>(`/api/stores/${slug}/feedback`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setKind(initialKind ?? null);
      setRating(0);
      setMessage("");
      setOpen(false);
      toast.success("Obrigado! Sua opinião foi enviada para a loja.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) setErrors(cause.fieldErrors);

      toast.error(cause instanceof Error ? cause.message : "Não foi possível enviar sua opinião.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como foi sua experiência?</DialogTitle>
          <DialogDescription>
            Sua resposta ajuda esta loja a melhorar a seleção e o atendimento. Não pedimos seus
            dados pessoais.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium">O que melhor descreve sua visita?</legend>
            <div className="mt-2 grid gap-2" role="radiogroup">
              {Object.entries(storefrontFeedbackKindLabels).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={kind === value ? "secondary" : "outline"}
                  role="radio"
                  aria-checked={kind === value}
                  className="h-auto min-h-10 justify-start whitespace-normal text-left"
                  onClick={() => setKind(value as StorefrontFeedbackInput["kind"])}
                >
                  {label}
                </Button>
              ))}
            </div>
            {errors.kind?.[0] ? <p className="field-error">{errors.kind[0]}</p> : null}
          </fieldset>
          <div>
            <RatingField value={rating} onChange={setRating} label="Qual nota você daria?" />
            {errors.rating?.[0] ? <p className="field-error">{errors.rating[0]}</p> : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`storefront-feedback-${context}`}>Comentário opcional</Label>
              <span className="text-xs text-muted-foreground">{message.length}/500</span>
            </div>
            <Textarea
              id={`storefront-feedback-${context}`}
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 h-28 min-h-28 max-h-28 resize-none overflow-y-auto field-sizing-fixed"
              placeholder={
                kind === "NOT_FOUND"
                  ? "Qual produto você estava procurando?"
                  : "Conte mais, se quiser."
              }
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message?.[0] ? <p className="field-error">{errors.message[0]}</p> : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={sending}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar opinião
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
