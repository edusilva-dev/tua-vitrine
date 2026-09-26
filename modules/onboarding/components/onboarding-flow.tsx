"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/http";
import { cn } from "@/lib/utils";
import { ProductForm } from "@/modules/catalog/components/product-manager";
import {
  normalizeSlug,
  type StoreDTO,
  storeIdentitySchema,
  whatsappSchema,
} from "@/modules/stores/contracts";
import { formatWhatsapp } from "@/modules/stores/phone";

export function OnboardingFlow({
  store,
  newStore = false,
  signupPlan = "FREE",
}: {
  store: StoreDTO | null;
  newStore?: boolean;
  signupPlan?: "FREE" | "ESSENTIAL" | "PROFESSIONAL";
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<StoreDTO | null>(newStore ? null : store);
  const [step, setStep] = useState(newStore ? 1 : Math.min(store?.onboardingStep ?? 1, 3));
  const [error, setError] = useState("");
  const slugEdited = useRef(Boolean(store?.slug));
  const identity = useForm<{ name: string; slug: string }>({
    resolver: zodResolver(storeIdentitySchema),
    defaultValues: {
      name: newStore ? "" : (store?.name ?? ""),
      slug: newStore ? "" : (store?.slug ?? ""),
    },
  });
  const contact = useForm<{ whatsapp: string }>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: { whatsapp: formatWhatsapp(newStore ? "+55" : (store?.whatsapp ?? "+55")) },
  });
  const nameField = identity.register("name");
  const slugField = identity.register("slug");
  const whatsappField = contact.register("whatsapp");

  async function saveIdentity(values: { name: string; slug: string }) {
    setError("");

    try {
      const saved = await api<StoreDTO>(
        newStore && !current ? "/api/admin/stores" : "/api/admin/onboarding/store",
        {
          method: newStore && !current ? "POST" : "PUT",
          body: JSON.stringify({ ...values, signupPlan }),
        }
      );

      setCurrent(saved);
      setStep(2);
      router.replace("/admin/onboarding");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  async function saveWhatsapp(values: { whatsapp: string }) {
    setError("");

    try {
      setCurrent(
        await api<StoreDTO>("/api/admin/onboarding/whatsapp", {
          method: "PUT",
          body: JSON.stringify(values),
        })
      );
      setStep(3);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-3">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#e0e9dc] text-primary">
          <Store size={27} />
        </span>
        <p className="eyebrow">SEU NEGÓCIO MERECE UMA VITRINE</p>
        <h1 className="page-title">Vamos colocar sua loja no mundo.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Três passos simples. Do seu jeito.</p>
      </div>
      <ol className="mb-8 flex items-center justify-center">
        {["Sua loja", "WhatsApp", "Primeiro produto"].map((label, index) => (
          <li
            key={label}
            className={cn(
              "flex flex-1 items-center gap-2 text-xs",
              index + 1 === step ? "font-semibold text-primary" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border",
                index + 1 <= step ? "border-primary bg-primary text-white" : "bg-card"
              )}
            >
              {index + 1 < step ? <Check size={14} /> : index + 1}
            </span>
            <span>{label}</span>
            {index < 2 && <span className="mx-2 h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        {step === 1 && (
          <form className="space-y-5" onSubmit={identity.handleSubmit(saveIdentity)}>
            <div>
              <h2 className="font-heading text-xl font-semibold">Como vamos chamar sua loja?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Esse é o começo da sua presença online.
              </p>
            </div>
            <div>
              <Label htmlFor="store-name">Nome da loja</Label>
              <Input
                id="store-name"
                className="mt-2"
                placeholder="Ex.: Ateliê da Clara"
                {...nameField}
                onChange={(event) => {
                  void nameField.onChange(event);

                  if (!slugEdited.current) {
                    identity.setValue("slug", normalizeSlug(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: identity.formState.isSubmitted,
                    });
                  }
                }}
              />
              {identity.formState.errors.name && (
                <p className="field-error">Informe um nome de 2 a 100 caracteres.</p>
              )}
            </div>
            <div>
              <Label htmlFor="store-slug">Endereço da vitrine</Label>
              <div className="mt-2 flex items-center rounded-md border bg-muted/30">
                <span className="pl-3 text-xs text-muted-foreground">
                  {store ? new URL(store.url).host : "localhost:3000"}/
                </span>
                <Input
                  id="store-slug"
                  className="border-0 bg-transparent shadow-none"
                  placeholder="atelie-da-clara"
                  {...slugField}
                  onChange={(event) => {
                    slugEdited.current = true;
                    identity.setValue("slug", normalizeSlug(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: identity.formState.isSubmitted,
                    });
                  }}
                />
              </div>
              {identity.formState.errors.slug && (
                <p className="field-error">{identity.formState.errors.slug.message}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Use letras, números e hífens. O endereço será reservado para sua loja.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={identity.formState.isSubmitting}>
              {identity.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Continuar
              <ArrowRight size={16} />
            </Button>
          </form>
        )}
        {step === 2 && (
          <form className="space-y-5" onSubmit={contact.handleSubmit(saveWhatsapp)}>
            <div>
              <h2 className="font-heading text-xl font-semibold">Onde a conversa começa.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Seus clientes vão falar com você por este WhatsApp para combinar a compra.
              </p>
            </div>
            <div>
              <Label htmlFor="store-whatsapp">WhatsApp com DDI</Label>
              <Input
                id="store-whatsapp"
                className="mt-2"
                type="tel"
                placeholder="+55 11 99999-9999"
                {...whatsappField}
                onChange={(event) =>
                  contact.setValue("whatsapp", formatWhatsapp(event.target.value), {
                    shouldDirty: true,
                    shouldValidate: contact.formState.isSubmitted,
                  })
                }
              />
              {contact.formState.errors.whatsapp && (
                <p className="field-error">{contact.formState.errors.whatsapp.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={contact.formState.isSubmitting}>
                {contact.formState.isSubmitting && <Loader2 className="animate-spin" />}Continuar
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        )}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <h2 className="font-heading text-xl font-semibold">A estrela da sua vitrine.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Cadastre seu primeiro produto para deixar a loja pronta.
              </p>
            </div>
            <ProductForm
              imagesPerProductLimit={(current?.signupPlan ?? signupPlan) === "FREE" ? 1 : 5}
              onSaved={() => {
                toast.success("Sua vitrine está pronta!");
                router.push("/admin");
                router.refresh();
              }}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep(2);
                setError("");
              }}
            >
              <ArrowLeft size={16} />
              Voltar ao WhatsApp
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="field-error mt-4">
            {error}
          </p>
        )}
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Seu progresso é salvo a cada etapa. Pode continuar depois.
      </p>
      {current && (
        <p className="mt-3 text-center">
          <Link href="/admin" className="text-xs text-primary underline underline-offset-4">
            Ir para o painel
          </Link>
        </p>
      )}
    </div>
  );
}
