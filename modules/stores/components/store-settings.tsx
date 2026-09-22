"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Grid2X2, Link as LinkIcon, List, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/http";
import { cn } from "@/lib/utils";
import type { AssetDTO } from "@/modules/catalog/contracts";
import {
  type StoreDTO,
  type StoreSettingsInput,
  storeSettingsSchema,
} from "@/modules/stores/contracts";

export function StoreSettings({ store }: { store: StoreDTO }) {
  const router = useRouter();
  const [logo, setLogo] = useState<AssetDTO | null>(store.logo);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const form = useForm<StoreSettingsInput>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: store.name,
      whatsapp: store.whatsapp ?? "+55 ",
      primaryColor: store.primaryColor,
      template: store.template,
      logoAssetId: store.logo?.id ?? null,
      customization: store.customization,
    },
  });
  const template = form.watch("template");
  const color = form.watch("primaryColor");

  async function save(values: StoreSettingsInput) {
    setError("");

    try {
      await api("/api/admin/store", { method: "PATCH", body: JSON.stringify(values) });
      toast.success("Sua vitrine ganhou um novo visual.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  async function upload(file?: File) {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const body = new FormData();

      body.append("file", file);
      const asset = await api<AssetDTO>("/api/admin/assets", { method: "POST", body });

      setLogo(asset);
      form.setValue("logoAssetId", asset.id, { shouldDirty: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar.");
    } finally {
      setUploading(false);
    }
  }

  async function generateQr() {
    try {
      const QRCode = await import("qrcode");

      setQr(
        await QRCode.toDataURL(store.url, {
          width: 720,
          margin: 3,
          color: { dark: "#183c3d", light: "#ffffff" },
        })
      );
    } catch {
      toast.error("Não foi possível gerar o QR code.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">COM A CARA DO SEU NEGÓCIO</p>
        <h1 className="page-title">Minha vitrine</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Os detalhes que fazem sua marca ser lembrada.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
        <form className="space-y-6" onSubmit={form.handleSubmit(save)}>
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-6 font-semibold">Identidade da loja</h2>
            <div className="mb-6 flex items-center gap-4">
              <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted text-2xl font-semibold text-primary">
                {logo ? (
                  <Image
                    src={logo.url}
                    alt="Logotipo da loja"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  store.name.slice(0, 1)
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium focus-within:ring-2 focus-within:ring-ring">
                  {uploading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Upload size={14} />
                  )}
                  Enviar logotipo
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploading}
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  Uma imagem quadrada funciona melhor.
                </p>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogo(null);
                      form.setValue("logoAssetId", null, { shouldDirty: true });
                    }}
                  >
                    Remover logo
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="settings-name">Nome da loja</Label>
                <Input id="settings-name" className="mt-2" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="field-error">Informe o nome da loja.</p>
                )}
              </div>
              <div>
                <Label htmlFor="settings-tagline">Uma frase sobre sua marca</Label>
                <Textarea
                  id="settings-tagline"
                  className="mt-2"
                  placeholder="Feito com carinho, escolhido para você."
                  {...form.register("customization.tagline")}
                />
                {form.formState.errors.customization?.tagline && (
                  <p className="field-error">Use no máximo 160 caracteres.</p>
                )}
              </div>
              <div>
                <Label htmlFor="settings-whatsapp">WhatsApp de atendimento</Label>
                <Input
                  id="settings-whatsapp"
                  type="tel"
                  className="mt-2"
                  {...form.register("whatsapp")}
                />
                {form.formState.errors.whatsapp && (
                  <p className="field-error">{form.formState.errors.whatsapp.message}</p>
                )}
              </div>
            </div>
          </section>
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-2 font-semibold">Um toque da sua personalidade</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              Escolha uma cor e o jeito de apresentar seus produtos.
            </p>
            <Label htmlFor="brand-color">Cor principal</Label>
            <div className="mt-2 flex gap-3">
              <Input
                id="brand-color"
                type="color"
                value={color}
                onChange={(event) =>
                  form.setValue("primaryColor", event.target.value, { shouldDirty: true })
                }
                className="h-11 w-16 p-1"
              />
              <Input
                aria-label="Código hexadecimal da cor"
                value={color}
                onChange={(event) =>
                  form.setValue("primaryColor", event.target.value, { shouldDirty: true })
                }
                className="max-w-36 font-mono"
              />
            </div>
            {form.formState.errors.primaryColor && (
              <p className="field-error">Use uma cor hexadecimal, como #245c60.</p>
            )}
            <fieldset aria-label="Modelo da vitrine" className="mt-6 grid grid-cols-2 gap-3">
              {[
                {
                  value: "grid" as const,
                  title: "Galeria",
                  description: "Fotos em destaque",
                  icon: Grid2X2,
                },
                {
                  value: "list" as const,
                  title: "Lista",
                  description: "Detalhes lado a lado",
                  icon: List,
                },
              ].map(({ value, title, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={template === value}
                  onClick={() => form.setValue("template", value, { shouldDirty: true })}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    template === value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="mb-3 grid h-20 place-items-center rounded-lg bg-muted/70">
                    <Icon size={32} strokeWidth={1.2} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </button>
              ))}
            </fieldset>
          </section>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting || uploading}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" size={16} />}Salvar
            alterações
          </Button>
        </form>
        <aside className="space-y-5">
          <section className="rounded-xl border bg-card p-6">
            <span className="mb-4 inline-flex rounded-lg bg-[#e8eee2] p-2 text-primary">
              <LinkIcon size={20} />
            </span>
            <h2 className="font-semibold">Sua loja, em um link</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Compartilhe nas redes sociais e leve seus produtos até seus clientes.
            </p>
            <p className="my-4 break-all rounded-lg bg-muted p-3 text-xs">{store.url}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(store.url);
                  toast.success("Link copiado.");
                } catch {
                  toast.error("Não foi possível copiar. Selecione o endereço acima.");
                }
              }}
            >
              Copiar link
            </Button>
          </section>
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Do balcão para a vitrine</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Use o QR code em embalagens, cartões ou na sua loja física.
            </p>
            {qr ? (
              <>
                <Image
                  src={qr}
                  alt={`QR code da loja ${store.name}`}
                  width={216}
                  height={216}
                  className="mx-auto my-4"
                />
                <Button asChild variant="outline" className="w-full">
                  <a href={qr} download={`${store.slug}-qrcode.png`}>
                    <Download size={15} />
                    Baixar PNG
                  </a>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="mt-5 w-full"
                variant="outline"
                onClick={() => void generateQr()}
              >
                Gerar QR code
              </Button>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Neste protótipo, o link usa o endereço local configurado. Publique a loja em um
              domínio acessível antes de imprimir.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
