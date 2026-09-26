"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { type SupportRequest, supportCategoryLabels, supportRequestSchema } from "../contracts";

const initialValues: SupportRequest = {
  category: "QUESTION",
  subject: "",
  message: "",
};

export function SupportForm({ enabled }: { enabled: boolean }) {
  const [values, setValues] = useState<SupportRequest>(initialValues);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = supportRequestSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);

      return;
    }

    setSending(true);
    setErrors({});

    try {
      await api<{ sent: true }>("/api/admin/support", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setValues(initialValues);
      toast.success("Mensagem enviada. Responderemos no e-mail da sua conta.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) {
        setErrors(cause.fieldErrors);
      }

      toast.error(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  if (!enabled)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-heading text-lg font-semibold">Canal em configuração</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-amber-800">
          O formulário de suporte ainda não está disponível. Assim que o canal de atendimento for
          configurado, você poderá falar com a equipe por esta página.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
      <div>
        <Label htmlFor="support-category">Como podemos ajudar?</Label>
        <Select
          value={values.category}
          onValueChange={(category: SupportRequest["category"]) =>
            setValues((current) => ({ ...current, category }))
          }
        >
          <SelectTrigger id="support-category" className="mt-2 h-11 w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(supportCategoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="support-subject">Assunto</Label>
        <Input
          id="support-subject"
          className="mt-2"
          maxLength={100}
          value={values.subject}
          onChange={(event) =>
            setValues((current) => ({ ...current, subject: event.target.value }))
          }
          aria-invalid={Boolean(errors.subject)}
          placeholder="Ex.: Não consigo publicar um produto"
        />
        {errors.subject?.[0] ? <p className="field-error">{errors.subject[0]}</p> : null}
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="support-message">Mensagem</Label>
          <span className="text-xs text-muted-foreground">{values.message.length}/3.000</span>
        </div>
        <Textarea
          id="support-message"
          className="mt-2 h-44 min-h-44 max-h-44 resize-none overflow-y-auto field-sizing-fixed"
          maxLength={3000}
          value={values.message}
          onChange={(event) =>
            setValues((current) => ({ ...current, message: event.target.value }))
          }
          aria-invalid={Boolean(errors.message)}
          placeholder="Descreva o que aconteceu e o que você esperava. Se houver, informe a página e o produto envolvidos."
        />
        {errors.message?.[0] ? <p className="field-error">{errors.message[0]}</p> : null}
      </div>
      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sua loja e o e-mail da conta serão incluídos para agilizar o atendimento.
        </p>
        <Button type="submit" disabled={sending} className="sm:shrink-0">
          {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}
