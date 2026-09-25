"use client";

import { ArrowRight, ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/http";
import type { AssetDTO } from "@/modules/catalog/contracts";
import type {
  AdminPromotionCampaignDTO,
  PromotionCampaignInput,
  PromotionProductChoice,
} from "../contracts";

const emptyCampaign: PromotionCampaignInput = {
  title: "",
  description: "",
  ctaLabel: "Ver produtos",
  active: false,
  bannerAssetId: null,
  productIds: [],
};

export function PromotionSettings({
  enabled,
  campaign,
  products,
}: {
  enabled: boolean;
  campaign: AdminPromotionCampaignDTO | null;
  products: PromotionProductChoice[];
}) {
  const [value, setValue] = useState<PromotionCampaignInput>(
    campaign
      ? {
          title: campaign.title,
          description: campaign.description,
          ctaLabel: campaign.ctaLabel,
          active: campaign.active,
          bannerAssetId: campaign.banner?.id ?? null,
          productIds: campaign.productIds,
        }
      : emptyCampaign
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(campaign?.banner?.url ?? null);

  if (!enabled)
    return (
      <section className="rounded-xl border bg-card p-6">
        <p className="eyebrow">CAMPANHA PROMOCIONAL</p>
        <h2 className="mt-1 font-semibold">Destaque uma seleção de produtos</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Banner e coleção promocional estão disponíveis no plano Profissional.
        </p>
      </section>
    );

  async function upload(file?: File) {
    if (!file) return;

    setUploading(true);

    try {
      const body = new FormData();

      body.append("file", file);
      const asset = await api<AssetDTO>("/api/admin/assets", { method: "POST", body });

      setValue((current) => ({ ...current, bannerAssetId: asset.id }));
      setBannerUrl(asset.url);
      toast.success("Imagem da campanha enviada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  function toggleProduct(id: string, checked: boolean) {
    setValue((current) => ({
      ...current,
      productIds: checked
        ? [...current.productIds, id]
        : current.productIds.filter((productId) => productId !== id),
    }));
  }

  async function save() {
    setSaving(true);

    try {
      await api("/api/admin/promotion", { method: "PUT", body: JSON.stringify(value) });
      toast.success("Campanha atualizada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar a campanha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <p className="eyebrow">CAMPANHA PROMOCIONAL</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Destaque uma seleção de produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uma campanha ativa aparece como banner na sua vitrine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="promotion-active">Campanha ativa</Label>
          <Switch
            id="promotion-active"
            checked={value.active}
            onCheckedChange={(active) => setValue((current) => ({ ...current, active }))}
          />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="promotion-title">Título</Label>
          <Input
            id="promotion-title"
            className="mt-2"
            maxLength={80}
            value={value.title}
            onChange={(event) => setValue((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="promotion-cta">Texto do botão</Label>
          <Input
            id="promotion-cta"
            className="mt-2"
            maxLength={30}
            value={value.ctaLabel}
            onChange={(event) =>
              setValue((current) => ({ ...current, ctaLabel: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="promotion-description">Descrição</Label>
        <Textarea
          id="promotion-description"
          className="mt-2"
          maxLength={180}
          value={value.description}
          onChange={(event) =>
            setValue((current) => ({ ...current, description: event.target.value }))
          }
        />
      </div>
      <div className="mt-4">
        <Label>Imagem do banner</Label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {value.bannerAssetId ? "Trocar imagem" : "Enviar imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
      </div>
      <div className="mt-6">
        <p className="text-sm font-medium">Prévia do banner</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Assim a campanha aparecerá na sua vitrine.
        </p>
        <div className="mt-3 overflow-hidden rounded-3xl border bg-primary text-primary-foreground">
          <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                Campanha em destaque
              </p>
              <h3 className="mt-2 break-words font-heading text-2xl font-semibold">
                {value.title.trim() || "Título da sua campanha"}
              </h3>
              <p className="mt-2 max-w-2xl break-words text-sm opacity-85">
                {value.description.trim() || "Conte aos clientes o que torna esta oferta especial."}
              </p>
              <Button
                asChild
                className="mt-5 max-w-full bg-background text-foreground hover:bg-background/90"
              >
                <span aria-hidden="true">
                  <span className="truncate">{value.ctaLabel.trim() || "Ver produtos"}</span>
                  <ArrowRight className="shrink-0" />
                </span>
              </Button>
            </div>
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Prévia da imagem da campanha"
                width={360}
                height={180}
                unoptimized
                className="h-36 w-full rounded-2xl object-cover md:w-72"
              />
            ) : (
              <div className="flex h-36 w-full items-center justify-center rounded-2xl border border-dashed border-current/30 bg-background/10 md:w-72">
                <div className="text-center text-xs opacity-75">
                  <ImagePlus className="mx-auto mb-2 size-5" />
                  Sua imagem aparecerá aqui
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Produtos da campanha</legend>
        <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
          {products.map((product) => (
            <label
              key={product.id}
              htmlFor={`promotion-${product.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
            >
              <Checkbox
                id={`promotion-${product.id}`}
                checked={value.productIds.includes(product.id)}
                onCheckedChange={(checked) => toggleProduct(product.id, checked === true)}
              />
              <span className="truncate">{product.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        className="mt-6"
        onClick={() => void save()}
        disabled={saving || uploading || !value.title.trim() || !value.ctaLabel.trim()}
      >
        {saving && <Loader2 className="animate-spin" />}
        Salvar campanha
      </Button>
    </section>
  );
}
