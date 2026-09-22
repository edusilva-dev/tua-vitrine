"use client";

import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { money } from "@/lib/format";
import type { ProductDTO } from "@/modules/catalog/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";
import { type CartLine, lineKey, resolveCart } from "../selection";
import { cartMessage, whatsappLink } from "../whatsapp";

export function CartSheet({
  open,
  onOpenChange,
  cart,
  setCart,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartLine[];
  setCart: (cart: CartLine[]) => void;
  store: StoreDTO;
}) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const ids = [...new Set(cart.map((item) => item.productId))].join(",");
  const lines = resolveCart(cart, products);
  const total = lines.reduce(
    (sum, line) => sum + (line.available ? line.priceCents * line.quantity : 0),
    0
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    async function refresh() {
      setLoading(true);
      setFailed(false);

      try {
        if (!ids) {
          setProducts([]);

          return;
        }

        const response = await fetch(`/api/stores/${store.slug}/products?ids=${ids}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("catalog");
        }

        const body = await response.json();

        setProducts(body.data);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void refresh();
    window.addEventListener("focus", refresh);

    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [open, ids, store.slug]);

  async function send() {
    if (!store.whatsapp || !cart.length) {
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/stores/${store.slug}/products?ids=${ids}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Não foi possível conferir os produtos. Tente novamente.");

      const body = await response.json();
      const fresh = resolveCart(cart, body.data as ProductDTO[]);

      setProducts(body.data);

      if (fresh.some((line) => !line.available)) {
        toast.error("Remova ou ajuste os itens indisponíveis antes de continuar.");

        return;
      }

      const changed = fresh.some(
        (line) =>
          lines.find((old) => lineKey(old) === lineKey(line))?.priceCents !== line.priceCents
      );

      if (changed) {
        toast.info("Os valores foram atualizados. Confira o subtotal e tente novamente.");

        return;
      }

      window.location.assign(
        whatsappLink(store.whatsapp, cartMessage(store.name, store.url, fresh))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b pb-5">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="size-5" />
            Seu carrinho
          </SheetTitle>
          <SheetDescription>
            Escolha com calma. Combine os detalhes com a loja pelo WhatsApp.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground" role="status">
              Conferindo preços e disponibilidade…
            </p>
          ) : null}
          {failed ? (
            <p className="py-4 text-sm text-destructive" role="alert">
              Não foi possível conferir o catálogo. Feche e abra o carrinho para tentar novamente.
            </p>
          ) : null}
          {!cart.length ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ShoppingBag className="mb-4 size-12 text-muted-foreground/40" />
              <h3 className="font-medium">Seu carrinho está esperando</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra um produto para adicionar suas escolhas.
              </p>
              <Button variant="outline" className="mt-5" onClick={() => onOpenChange(false)}>
                Explorar produtos
              </Button>
            </div>
          ) : null}
          {lines.map((line) => (
            <div key={lineKey(line)} className="border-b py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{line.label}</h3>
                  {!loading && !failed && !line.available ? (
                    <p className="mt-1 text-xs text-destructive">
                      Indisponível. Remova este item ou escolha outra opção.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {money(line.priceCents)} cada
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${line.name}`}
                  onClick={() => setCart(cart.filter((item) => lineKey(item) !== lineKey(line)))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Diminuir quantidade de ${line.name}`}
                    disabled={line.quantity <= 1}
                    onClick={() =>
                      setCart(
                        cart.map((item) =>
                          lineKey(item) === lineKey(line)
                            ? { ...item, quantity: item.quantity - 1 }
                            : item
                        )
                      )
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="text-sm tabular-nums">{line.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Aumentar quantidade de ${line.name}`}
                    disabled={line.quantity >= 99}
                    onClick={() =>
                      setCart(
                        cart.map((item) =>
                          lineKey(item) === lineKey(line)
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                        )
                      )
                    }
                  >
                    <Plus />
                  </Button>
                </div>
                <span className="text-sm font-medium">
                  {line.available ? money(line.priceCents * line.quantity) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-5">
          <div className="mb-2 flex justify-between font-semibold">
            <span>Subtotal estimado</span>
            <span>{money(total)}</span>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
            Frete, pagamento e disponibilidade são confirmados com o vendedor. Os produtos não ficam
            reservados.
          </p>
          <Button
            className="w-full"
            size="lg"
            disabled={
              loading ||
              failed ||
              sending ||
              !cart.length ||
              lines.some((line) => !line.available) ||
              !store.whatsapp
            }
            onClick={send}
          >
            <MessageCircle />
            {sending ? "Conferindo produtos…" : "Falar com vendedor"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
