"use client";

import { Loader2, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client/http";

type ProductChoice = { id: string; name: string; published: boolean };

export function ProductPublicationDialog({
  required,
  limit,
}: {
  required: boolean;
  limit: number;
}) {
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(required);
  const [loading, setLoading] = useState(required);
  const [saving, setSaving] = useState(false);
  const dialogOpen = required || open;

  useEffect(() => {
    if (!dialogOpen) return;

    setLoading(true);

    void api<ProductChoice[]>("/api/admin/products/publication")
      .then((items) => {
        setProducts(items);
        setSelected(
          items
            .filter((item) => item.published)
            .slice(0, limit)
            .map((item) => item.id)
        );
      })
      .catch((cause) =>
        toast.error(
          cause instanceof Error ? cause.message : "Não foi possível carregar os produtos."
        )
      )
      .finally(() => setLoading(false));
  }, [dialogOpen, limit]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");

    return normalized
      ? products.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(normalized))
      : products;
  }, [products, query]);

  function toggle(id: string, checked: boolean) {
    if (!checked) {
      setSelected((current) => current.filter((item) => item !== id));

      return;
    }

    if (selected.length >= limit) {
      toast.error(`Seu plano permite publicar até ${limit} produtos.`);

      return;
    }

    setSelected((current) => [...current, id]);
  }

  async function save() {
    setSaving(true);

    try {
      await api("/api/admin/products/publication", {
        method: "PUT",
        body: JSON.stringify({ productIds: selected }),
      });
      setOpen(false);
      window.location.reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível atualizar a vitrine.");
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Store />
        Gerenciar vitrine
      </Button>
      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (!required) setOpen(nextOpen);
        }}
      >
        <DialogContent
          showCloseButton={!required}
          className="max-h-[90vh] overflow-hidden sm:max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>Escolha os produtos da sua vitrine</DialogTitle>
            <DialogDescription>
              Escolha até {limit} produtos para exibir aos clientes. Os demais continuam salvos como
              rascunho.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="grid min-h-48 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar produto"
                />
                <span className="shrink-0 text-sm font-medium">
                  {selected.length}/{limit}
                </span>
              </div>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {visible.map((product) => {
                  const checked = selected.includes(product.id);

                  return (
                    <label
                      htmlFor={`publish-${product.id}`}
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        id={`publish-${product.id}`}
                        checked={checked}
                        onCheckedChange={(value) => toggle(product.id, value === true)}
                      />
                      <span className="min-w-0 truncate">{product.name}</span>
                    </label>
                  );
                })}
              </div>
              <Button onClick={() => void save()} disabled={saving || selected.length > limit}>
                {saving && <Loader2 className="animate-spin" />}
                Publicar produtos selecionados
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
