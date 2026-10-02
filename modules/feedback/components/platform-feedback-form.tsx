"use client";

import { Loader2, MessageSquareHeart, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  type PlatformFeedbackInput,
  platformFeedbackKindLabels,
  platformFeedbackSchema,
} from "../contracts";
import { RatingField } from "./rating-field";

const initialValues: PlatformFeedbackInput = {
  kind: "SUGGESTION",
  rating: 0,
  message: undefined,
  context: "/admin/support",
};

export function PlatformFeedbackForm() {
  const [values, setValues] = useState<PlatformFeedbackInput>(initialValues);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = platformFeedbackSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);

      return;
    }

    setSending(true);
    setErrors({});

    try {
      await api<{ saved: true }>("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setValues(initialValues);
      toast.success("Feedback recebido. Obrigado por ajudar a melhorar a Tua Vitrine.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) setErrors(cause.fieldErrors);

      toast.error(cause instanceof Error ? cause.message : "Não foi possível enviar o feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <span className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareHeart className="size-5" />
        </span>
        <CardTitle>Ajude a melhorar a plataforma</CardTitle>
        <CardDescription>
          Conte o que funcionou, o que atrapalhou ou o que faria diferença no seu dia a dia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="feedback-kind">Tipo de feedback</Label>
            <Select
              value={values.kind}
              onValueChange={(kind: PlatformFeedbackInput["kind"]) =>
                setValues((current) => ({ ...current, kind }))
              }
            >
              <SelectTrigger id="feedback-kind" className="mt-2 h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformFeedbackKindLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <RatingField
              value={values.rating}
              onChange={(rating) => setValues((current) => ({ ...current, rating }))}
              label="Como está sua experiência?"
            />
            {errors.rating?.[0] ? <p className="field-error">{errors.rating[0]}</p> : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="platform-feedback-message">Comentário opcional</Label>
              <span className="text-xs text-muted-foreground">
                {values.message?.length ?? 0}/2.000
              </span>
            </div>
            <Textarea
              id="platform-feedback-message"
              className="mt-2 h-36 min-h-36 max-h-36 resize-none overflow-y-auto field-sizing-fixed"
              maxLength={2000}
              value={values.message ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, message: event.target.value }))
              }
              aria-invalid={Boolean(errors.message)}
              placeholder="O que você gostaria que fosse diferente?"
            />
            {errors.message?.[0] ? <p className="field-error">{errors.message[0]}</p> : null}
          </div>
          <Button type="submit" disabled={sending} className="w-full sm:w-auto">
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar feedback
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
