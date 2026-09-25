"use client";

import { ImagePlus, Loader2 } from "lucide-react";
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
