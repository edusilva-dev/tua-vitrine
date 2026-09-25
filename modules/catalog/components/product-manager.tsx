"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { money } from "@/lib/format";
import {
  type AssetDTO,
  type CategoryDTO,
  type ProductDTO,
  type ProductInput,
  type ProductListDTO,
  productInputSchema,
} from "@/modules/catalog/contracts";
import { ProductImportDialog } from "./product-import-dialog";
import { ProductPublicationDialog } from "./product-publication-dialog";

const emptyProduct: ProductInput = {
  name: "",
  description: "",
  priceCents: 0,
  available: true,
  categoryName: "",
  assetIds: [],
  variants: [],
};

export function ProductForm({
  product,
  onSaved,
  onDirtyChange,
}: {
  product?: ProductDTO;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [images, setImages] = useState<AssetDTO[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const form = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          available: product.available,
          categoryName: product.category?.name ?? "",
          assetIds: product.images.map((image) => image.id),
          variants: product.variants,
        }
      : emptyProduct,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const { errors, isSubmitting } = form.formState;

  async function upload(file?: File) {
    if (!file) return;

    if (images.length >= 5) {
      setError("Adicione no máximo 5 imagens.");

      return;
    }

    setUploading(true);
    setError("");

    try {
      const body = new FormData();

      body.append("file", file);
      const asset = await api<AssetDTO>("/api/admin/assets", { method: "POST", body });
      const next = [...images, asset];

      setImages(next);
      form.setValue(
        "assetIds",
        next.map((image) => image.id),
        { shouldDirty: true }
      );
      onDirtyChange?.(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function save(value: ProductInput) {
    setError("");

    try {
      await api<ProductDTO>(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Idempotency-Key": requestId.current },
        body: JSON.stringify(value),
      });
      toast.success(product ? "Produto atualizado." : "Produto adicionado à vitrine.");
      onDirtyChange?.(false);
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) {
        for (const [field, messages] of Object.entries(cause.fieldErrors)) {
          if (field in value)
            form.setError(field as keyof ProductInput, {
              message: messages[0] ?? "Confira este campo.",
            });
        }
      }

      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o produto.");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(save)}
      onChange={() => onDirtyChange?.(true)}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="product-name">Nome do produto</Label>
        <Input
          id="product-name"
          className="mt-2"
          placeholder="Ex.: Vaso de cerâmica artesanal"
          {...form.register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="product-description">Descrição</Label>
        <Textarea
          id="product-description"
          className="mt-2 min-h-24"
          placeholder="Conte os detalhes que tornam esse produto especial."
          {...form.register("description")}
        />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="product-price">Preço (R$)</Label>
          <Input
            id="product-price"
            type="number"
            step="0.01"
            min="0"
            className="mt-2"
            defaultValue={(product?.priceCents ?? 0) / 100}
            onChange={(event) =>
              form.setValue("priceCents", Math.round(Number(event.target.value) * 100), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {errors.priceCents && <p className="field-error">Informe um preço válido.</p>}
        </div>
        <div>
          <Label htmlFor="product-category">Categoria</Label>
          <Input
            id="product-category"
            className="mt-2"
            placeholder="Ex.: Decoração"
            {...form.register("categoryName")}
          />
          {errors.categoryName && <p className="field-error">{errors.categoryName.message}</p>}
        </div>
      </div>
      <div>
        <Label>
          Fotos do produto{" "}
          <span className="font-normal text-muted-foreground">({images.length}/5)</span>
        </Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((image, index) => (
            <div key={image.id} className="relative size-24 overflow-hidden rounded-lg border">
              <Image
                src={image.url}
                alt={`Foto ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 size-6 rounded-full"
                aria-label={`Remover foto ${index + 1}`}
                onClick={() => {
                  const next = images.filter((item) => item.id !== image.id);

                  setImages(next);
                  form.setValue(
                    "assetIds",
                    next.map((item) => item.id),
                    { shouldDirty: true }
                  );
                  onDirtyChange?.(true);
                }}
              >
                <X size={12} />
              </Button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
              Adicionar
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          JPG, PNG ou WebP. Até 5 imagens por produto.
        </p>
      </div>
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label>Variações</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Tamanho, cor ou outras opções. Sem controle de estoque.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onDirtyChange?.(true);
              append({
                label: "",
                options: { Opção: "" },
                priceCents: form.getValues("priceCents"),
                available: true,
              });
            }}
          >
            <Plus size={14} />
            Adicionar
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="mt-4 space-y-3 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Variação {index + 1}</p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label={`Remover variação ${index + 1}`}
                onClick={() => {
                  remove(index);
                  onDirtyChange?.(true);
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`variant-label-${index}`}>Nome</Label>
                <Input
                  id={`variant-label-${index}`}
                  placeholder="Azul / M"
                  {...form.register(`variants.${index}.label`)}
                />
              </div>
              <div>
                <Label htmlFor={`variant-price-${index}`}>Preço (R$)</Label>
                <Input
                  id={`variant-price-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={field.priceCents / 100}
                  onChange={(event) =>
                    form.setValue(
                      `variants.${index}.priceCents`,
                      Math.round(Number(event.target.value) * 100),
                      { shouldDirty: true }
                    )
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`variant-options-${index}`}>
                Opções (nome: valor, separadas por vírgula)
              </Label>
              <Input
                id={`variant-options-${index}`}
                placeholder="Cor: Azul, Tamanho: M"
                defaultValue={Object.entries(field.options)
                  .filter(([, value]) => value)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ")}
                onChange={(event) => {
                  const options: Record<string, string> = {};

                  for (const entry of event.target.value.split(",")) {
                    const [key, ...parts] = entry.split(":");

                    if (key?.trim() && parts.join(":").trim())
                      options[key.trim()] = parts.join(":").trim();
                  }

                  form.setValue(`variants.${index}.options`, options, { shouldDirty: true });
                }}
              />
            </div>
            <label
              htmlFor={`variant-available-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <Controller
                control={form.control}
                name={`variants.${index}.available`}
                render={({ field }) => (
                  <Checkbox
                    id={`variant-available-${index}`}
                    checked={field.value}
                    onCheckedChange={(value) => {
                      field.onChange(value === true);
                      onDirtyChange?.(true);
                    }}
                    aria-label={`Variação ${index + 1} disponível`}
                  />
                )}
              />
              Variação disponível
            </label>
          </div>
        ))}
        {errors.variants && (
          <p className="field-error">
            {errors.variants.message ??
              errors.variants.root?.message ??
              "Confira nomes, preços e opções das variações. Use as mesmas opções, com combinações diferentes."}
          </p>
        )}
      </div>
      <label
        htmlFor="product-available"
        className="flex items-center gap-3 rounded-lg border p-3 text-sm"
      >
        <Controller
          control={form.control}
          name="available"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={(value) => {
                field.onChange(value === true);
                onDirtyChange?.(true);
              }}
              id="product-available"
              aria-label="Produto disponível na vitrine"
            />
          )}
        />
        <span>Produto disponível na vitrine</span>
      </label>
      {error && (
        <p role="alert" className="field-error rounded-lg bg-destructive/5 p-3">
          {error}
        </p>
      )}
      <div className="sticky -bottom-1 flex justify-end border-t bg-background py-4">
        <Button type="submit" disabled={isSubmitting || uploading}>
          {(isSubmitting || uploading) && <Loader2 className="animate-spin" size={16} />}{" "}
          {product ? "Salvar alterações" : "Adicionar produto"}
        </Button>
      </div>
    </form>
  );
}

export function ProductManager({
  products,
  categories,
  canImportProducts = false,
  productLimit,
  needsProductSelection = false,
  initialQuery = "",
  initialCategory = "",
}: {
  products: ProductListDTO;
  categories: CategoryDTO[];
  canImportProducts?: boolean;
  productLimit: number;
  needsProductSelection?: boolean;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductDTO | null | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [deleting, setDeleting] = useState<ProductDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || "all");

  function navigate(page = 1, nextCategory = category) {
    const params = new URLSearchParams();

    if (query) params.set("q", query);

    if (nextCategory !== "all") params.set("category", nextCategory);

    if (page > 1) params.set("page", String(page));

    router.push(`/admin/products?${params.toString()}`);
  }

  async function removeProduct() {
    if (!deleting) return;

    setBusy(true);

    try {
      await api(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
      toast.success("Produto excluído.");
      setDeleting(null);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <ProductPublicationDialog required={needsProductSelection} limit={productLimit} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">O QUE SUA LOJA TEM DE MELHOR</p>
          <h1 className="page-title">
            Meus produtos
            <span className="ml-3 align-middle text-base font-normal text-muted-foreground">
              {products.pagination.total}
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Um catálogo cheio de possibilidades para seus clientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProductImportDialog enabled={canImportProducts} />
          <Button
            onClick={() => {
              setEditing(null);
              setDirty(false);
            }}
          >
            <Plus size={17} />
            Adicionar produto
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate();
          }}
          className="relative min-w-56 flex-1"
        >
          <Search size={17} className="absolute left-3 top-3 text-muted-foreground" />
          <Input
            aria-label="Buscar produtos"
            placeholder="Buscar no seu catálogo..."
            className="h-11 bg-card pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value);
            navigate(1, value);
          }}
        >
          <SelectTrigger className="h-11 min-w-44 bg-card">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {products.data.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.data.map((product) => (
            <article key={product.id} className="group overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[4/3] bg-[#eeeee6]">
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[#98a69b]">
                    <Package size={42} strokeWidth={1} />
                    <span className="text-xs">Seu produto em destaque</span>
                  </div>
                )}
                <Badge
                  variant="secondary"
                  className="absolute left-3 top-3 bg-white/90 text-[#345044]"
                >
                  {product.available ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
              <div className="p-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.category?.name ?? "Sem categoria"}
                </p>
                <h2 className="truncate font-semibold">{product.name}</h2>
                <div className="mt-3 flex items-center justify-between">
                  <strong className="text-lg text-primary">{money(product.priceCents)}</strong>
                  <span className="text-xs text-muted-foreground">
                    {product.variants.length ? `${product.variants.length} variações` : ""}
                  </span>
                </div>
                <div className="mt-5 flex gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={() => {
                      setEditing(product);
                      setDirty(false);
                    }}
                  >
                    <Pencil size={14} />
                    Editar produto
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Excluir ${product.name}`}
                    onClick={() => setDeleting(product)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-20 text-center">
          <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#eef1e9] text-primary">
            <Package size={30} strokeWidth={1.5} />
          </span>
          <h2 className="font-heading text-xl font-semibold">
            {query || category !== "all"
              ? "Nenhum produto encontrado"
              : "Sua vitrine começa com um produto"}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            {query || category !== "all"
              ? "Tente outra busca ou escolha uma categoria diferente."
              : "Adicione uma boa foto, conte os detalhes e deixe seus clientes se apaixonarem."}
          </p>
          <Button className="mt-6" onClick={() => setEditing(null)}>
            <Plus size={16} />
            Adicionar produto
          </Button>
        </div>
      )}
      {products.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={products.pagination.page === 1}
            onClick={() => navigate(products.pagination.page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm">
            {products.pagination.page} de {products.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={products.pagination.page >= products.pagination.totalPages}
            onClick={() => navigate(products.pagination.page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (open) return;

          if (dirty) {
            setDiscard(true);

            return;
          }

          setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Um novo produto na vitrine"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes. Uma boa apresentação faz a diferença.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <ProductForm
              key={editing?.id ?? "new"}
              {...(editing ? { product: editing } : {})}
              onDirtyChange={setDirty}
              onSaved={() => {
                setEditing(undefined);
                setDirty(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Os detalhes que ainda não foram salvos serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscard(false);
                setEditing(undefined);
                setDirty(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este produto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” será removido da sua vitrine. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void removeProduct()}>
              {busy && <Loader2 className="animate-spin" size={16} />}Excluir produto
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
