"use client";

import { Heart, MessageCircle, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { money } from "@/lib/format";
import type { ProductDTO } from "@/modules/catalog/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";
import type { CartLine } from "../selection";
import { whatsappLink } from "../whatsapp";
import { ProductImage } from "./product-image";

export function ProductDetail({
  product,
  store,
  liked,
  ready,
  onLike,
  onAdd,
  onClose,
}: {
  product: ProductDTO;
  store: StoreDTO;
  liked: boolean;
  ready: boolean;
  onLike: () => void;
  onAdd: (line: CartLine) => void;
  onClose: () => void;
}) {
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const variant = product.variants.find((item) => item.id === variantId);
  const available = product.available && (!product.variants.length || !!variant?.available);
  const price = variant?.priceCents ?? product.priceCents;
  const message = `Olá, ${store.name}! Tenho interesse em ${quantity}x ${product.name}${variant ? ` · ${variant.label}` : ""} (${money(price)} cada). Pode me ajudar?\n${store.url}`;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-hidden p-0 sm:max-w-4xl">
        <div className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:overflow-hidden">
          <div className="bg-muted/25 p-5 sm:overflow-y-auto sm:p-6">
            <ProductImage
              image={product.images[imageIndex]}
              name={product.name}
              className="rounded-2xl"
            />
            {product.images.length > 1 ? (
              <div className="mt-3 flex gap-2">
                {product.images.map((image, index) => (
                  <Button
                    key={image.id}
                    variant={index === imageIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImageIndex(index)}
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-col p-5 sm:max-h-[calc(100dvh-1rem)] sm:p-6">
            <div className="min-h-0 flex-1 sm:overflow-y-auto sm:pr-2">
              <DialogHeader className="text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {product.category?.name ?? "Catálogo"}
                </p>
                <DialogTitle className="font-heading text-2xl">{product.name}</DialogTitle>
                <DialogDescription className="whitespace-pre-wrap leading-relaxed">
                  {product.description || "Fale com a loja para saber mais sobre este produto."}
                </DialogDescription>
              </DialogHeader>
              <p className="my-5 text-3xl font-semibold tracking-tight">
                {product.variants.length && !variant ? (
                  <span className="mr-1 text-sm font-normal text-muted-foreground">
                    A partir de
                  </span>
                ) : null}
                {money(
                  product.variants.length && !variant
                    ? Math.min(...product.variants.map((item) => item.priceCents))
                    : price
                )}
              </p>
              {product.variants.length ? (
                <div className="mb-4 space-y-2">
                  <Label htmlFor="product-variant">Escolha uma opção</Label>
                  <Select value={variantId} onValueChange={setVariantId}>
                    <SelectTrigger id="product-variant" className="w-full">
                      <SelectValue placeholder="Selecione cor, tamanho…" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.variants.map((item) => (
                        <SelectItem key={item.id} value={item.id} disabled={!item.available}>
                          {item.label} · {money(item.priceCents)}
                          {!item.available ? " · Indisponível" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="mb-5 space-y-2">
                <Label htmlFor="product-quantity">Quantidade</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
                  }
                  className="w-24"
                />
              </div>
            </div>
            <div className="grid shrink-0 gap-2 border-t bg-popover pt-4">
              <Button
                size="lg"
                disabled={!available || !ready}
                onClick={() => {
                  onAdd({
                    productId: product.id,
                    variantId: variant?.id ?? null,
                    quantity,
                    name: product.name,
                  });
                  onClose();
                }}
              >
                <ShoppingBag />
                {product.available ? "Adicionar ao carrinho" : "Indisponível"}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!available || !store.whatsapp || !ready}
                  asChild={available && !!store.whatsapp && ready}
                >
                  {available && store.whatsapp ? (
                    <a
                      href={whatsappLink(store.whatsapp, message)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle />
                      Perguntar no WhatsApp
                    </a>
                  ) : (
                    <span>Escolha uma opção</span>
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={liked ? "Remover dos favoritos" : "Salvar nos favoritos"}
                  aria-pressed={liked}
                  disabled={!ready}
                  onClick={onLike}
                >
                  <Heart className={liked ? "fill-rose-500 text-rose-500" : ""} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
