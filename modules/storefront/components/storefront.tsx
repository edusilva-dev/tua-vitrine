"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/format";
import type {
  CategoryDTO,
  ProductDTO,
  ProductFilters,
  ProductListDTO,
  ProductOptionFilterDTO,
} from "@/modules/catalog/contracts";
import { encodeVariantFilter } from "@/modules/catalog/contracts";
import type { PublicPromotionCampaignDTO } from "@/modules/promotions/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";
import { type CartLine, lineKey } from "../selection";
import { useSelections } from "../use-selections";
import { whatsappLink } from "../whatsapp";
import { CartSheet } from "./cart-sheet";
import { ProductDetail } from "./product-detail";
import { ProductImage } from "./product-image";

function selectedVariantFilter(filters: ProductFilters, name: string): string {
  const value = filters.variants?.[name];

  return value ? encodeVariantFilter(name, value) : "all";
}

export function Storefront({
  store,
  catalog,
  categories,
  optionFilters,
  filters,
  preview = false,
  showFreeBranding = false,
  promotion = null,
  promotionActive = false,
}: {
  store: StoreDTO;
  catalog: ProductListDTO;
  categories: CategoryDTO[];
  optionFilters: ProductOptionFilterDTO[];
  filters: ProductFilters;
  preview?: boolean;
  showFreeBranding?: boolean;
  promotion?: PublicPromotionCampaignDTO | null;
  promotionActive?: boolean;
}) {
  const selection = useSelections(store.id, store.slug, preview);
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<ProductDTO[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesFailed, setFavoritesFailed] = useState(false);
  const impression = useRef<string | null>(null);
  const favoriteIds = selection.likes.join(",");
  const favoriteIdList = useMemo(() => (favoriteIds ? favoriteIds.split(",") : []), [favoriteIds]);
  const basePath = preview ? "/admin/preview" : `/${store.slug}`;

  async function track(
    type: "STORE_VIEW" | "PRODUCT_VIEW",
    productId?: string,
    eventId = crypto.randomUUID()
  ) {
    if (preview) return;

    const payload = JSON.stringify({ eventId, type, ...(productId ? { productId } : {}) });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`/api/stores/${store.slug}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });

        if (response.ok || response.status < 500) return;
      } catch {
        // Analytics is deliberately best-effort and never blocks shopping.
      }
    }
  }

  useEffect(() => {
    if (preview || impression.current) return;

    const eventId = crypto.randomUUID();

    impression.current = eventId;
    const payload = JSON.stringify({ eventId, type: "STORE_VIEW" });

    void fetch(`/api/stores/${store.slug}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => undefined);
  }, [preview, store.slug]);

  useEffect(() => {
    if (!favoritesOnly) return;

    const controller = new AbortController();

    async function load() {
      setFavoritesLoading(true);
      setFavoritesFailed(false);

      try {
        if (!favoriteIds) {
          setFavoriteProducts([]);

          return;
        }

        const batches = Array.from({ length: Math.ceil(favoriteIdList.length / 100) }, (_, index) =>
          favoriteIdList.slice(index * 100, index * 100 + 100)
        );
        const responses = await Promise.all(
          batches.map(async (ids) => {
            const response = await fetch(
              `/api/stores/${store.slug}/products?ids=${ids.join(",")}`,
              { signal: controller.signal }
            );

            if (!response.ok) throw new Error("favorites");

            return (await response.json()).data as ProductDTO[];
          })
        );
        const productsById = new Map(responses.flat().map((product) => [product.id, product]));

        setFavoriteProducts(favoriteIdList.flatMap((id) => productsById.get(id) ?? []));
      } catch {
        if (!controller.signal.aborted) setFavoritesFailed(true);
      } finally {
        if (!controller.signal.aborted) setFavoritesLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [favoriteIdList, favoriteIds, favoritesOnly, store.slug]);

  function openProduct(product: ProductDTO) {
    setSelected(product);
    void track("PRODUCT_VIEW", product.id);
  }

  function addToCart(line: CartLine) {
    const existing = selection.cart.find((item) => lineKey(item) === lineKey(line));

    if (!existing && selection.cart.length >= 100) {
      toast.error("Seu carrinho pode ter até 100 produtos diferentes.");

      return;
    }

    selection.setCart(
      existing
        ? selection.cart.map((item) =>
            lineKey(item) === lineKey(line)
              ? { ...item, quantity: Math.min(99, item.quantity + line.quantity) }
              : item
          )
        : [...selection.cart, line]
    );
    toast.success("Produto adicionado ao carrinho.");
  }

  function pageUrl(page: number) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);

    if (filters.category) params.set("category", filters.category);

    if (filters.available) params.set("available", filters.available);

    for (const [name, value] of Object.entries(filters.variants ?? {})) {
      params.append("variant", encodeVariantFilter(name, value));
    }

    if (promotionActive) params.set("campaign", "1");

    params.set("page", String(page));

    return `${basePath}?${params}`;
  }

  const products = favoritesOnly ? favoriteProducts : catalog.data;
  const list = store.template === "list";
  const totalItems = selection.cart.reduce((sum, line) => sum + line.quantity, 0);
  const color = store.primaryColor;
  const luminance =
    parseInt(color.slice(1, 3), 16) * 0.299 +
    parseInt(color.slice(3, 5), 16) * 0.587 +
    parseInt(color.slice(5, 7), 16) * 0.114;
  const theme = {
    "--primary": color,
    "--primary-foreground": luminance > 155 ? "#102b2b" : "#ffffff",
    "--ring": color,
  } as CSSProperties;

  return (
    <div style={theme} className="min-h-screen bg-background">
      {preview ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-foreground px-4 py-2 text-center text-xs text-background">
          <span>Prévia da sua vitrine · visitas e curtidas não entram nas métricas</span>
          <Link href="/admin" className="underline underline-offset-4">
            Voltar ao painel
          </Link>
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={basePath} className="flex min-w-0 items-center gap-3">
            {store.logo ? (
              <Image
                src={store.logo.url}
                alt=""
                width={42}
                height={42}
                className="size-11 rounded-xl object-cover"
                unoptimized
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Store className="size-5" />
              </span>
            )}
            <span className="truncate font-heading text-lg font-semibold tracking-tight">
              {store.name}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant={favoritesOnly ? "secondary" : "ghost"}
              size="icon"
              aria-label="Ver favoritos"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              disabled={!selection.ready}
            >
              <Heart className={favoritesOnly ? "fill-current" : ""} />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCartOpen(true)}
              disabled={!selection.ready}
              aria-label={`Abrir carrinho, ${totalItems} itens`}
            >
              <ShoppingBag />
              <span className="hidden sm:inline">Carrinho</span>
              <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {totalItems}
              </span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="relative my-7 overflow-hidden rounded-3xl border bg-card px-7 py-9 sm:my-9 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-32 size-96 rounded-full border-[55px] border-primary/5" />
          <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Compre de quem está perto
          </p>
          <h1 className="relative max-w-xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {store.customization.tagline || "Encontre seu próximo favorito."}
          </h1>
          <p className="relative mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Explore nossa seleção e fale direto com a gente. Suas escolhas, com um atendimento de
            verdade.
          </p>
          {store.whatsapp ? (
            <Button variant="outline" className="relative mt-6 bg-background" asChild>
              <a
                href={whatsappLink(
                  store.whatsapp,
                  `Olá, ${store.name}! Vim pela vitrine e gostaria de conversar.\n${store.url}`
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                Conversar com a loja
                <ArrowRight className="ml-3 size-4" />
              </a>
            </Button>
          ) : null}
        </section>
        {promotion ? (
          <section className="mb-7 overflow-hidden rounded-3xl border bg-primary text-primary-foreground sm:mb-9">
            <div className="grid items-center gap-6 p-7 sm:p-9 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                  Campanha em destaque
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold">{promotion.title}</h2>
                {promotion.description ? (
                  <p className="mt-2 max-w-2xl text-sm opacity-85">{promotion.description}</p>
                ) : null}
                <Button
                  className="mt-5 bg-background text-foreground hover:bg-background/90"
                  asChild
                >
                  <Link href={promotionActive ? basePath : `${basePath}?campaign=1`}>
                    {promotionActive ? "Ver todos os produtos" : promotion.ctaLabel}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              {promotion.bannerUrl ? (
                <Image
                  src={promotion.bannerUrl}
                  alt=""
                  width={360}
                  height={180}
                  unoptimized
                  className="h-36 w-full rounded-2xl object-cover md:w-72"
                />
              ) : null}
            </div>
          </section>
        ) : null}
        {selection.storageFailed ? (
          <p
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            Seu navegador não permitiu salvar as escolhas. Elas ficam disponíveis somente nesta
            página.
          </p>
        ) : null}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
              Nossa seleção
            </p>
            <h2 className="font-heading text-2xl font-semibold">
              {favoritesOnly ? "Seus favoritos" : "Todos os produtos"}{" "}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {favoritesOnly ? products.length : catalog.pagination.total}
              </span>
            </h2>
          </div>
          {!favoritesOnly ? (
            <form action={basePath} className="flex flex-wrap gap-2">
              <div className="relative min-w-40 flex-1">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Buscar produtos"
                  aria-label="Buscar produtos"
                  className="h-10 bg-card pl-9"
                />
              </div>
              <Select name="category" defaultValue={filters.category || "all"}>
                <SelectTrigger className="h-10 min-w-36 bg-card" aria-label="Categoria">
                  <SelectValue placeholder="Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="available" defaultValue={filters.available || "all"}>
                <SelectTrigger className="h-10 min-w-32 bg-card" aria-label="Disponibilidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Disponíveis</SelectItem>
                  <SelectItem value="false">Indisponíveis</SelectItem>
                </SelectContent>
              </Select>
              {optionFilters.map((option) => (
                <Select
                  key={option.name}
                  name="variant"
                  defaultValue={selectedVariantFilter(filters, option.name)}
                >
                  <SelectTrigger
                    className="h-10 min-w-32 bg-card"
                    aria-label={`Filtrar por ${option.name}`}
                  >
                    <SelectValue placeholder={option.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{option.name}: todos</SelectItem>
                    {option.values.map((value) => (
                      <SelectItem key={value} value={encodeVariantFilter(option.name, value)}>
                        {option.name}: {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
              <Button type="submit" variant="secondary" className="h-10">
                Filtrar
              </Button>
            </form>
          ) : (
            <Button variant="outline" onClick={() => setFavoritesOnly(false)}>
              <X />
              Limpar favoritos do filtro
            </Button>
          )}
        </div>
        {favoritesLoading ? (
          <p role="status" className="py-12 text-center text-muted-foreground">
            Buscando seus favoritos…
          </p>
        ) : null}
        {favoritesFailed ? (
          <p role="alert" className="py-6 text-center text-destructive">
            Não foi possível buscar seus favoritos. Tente abrir esta lista novamente.
          </p>
        ) : null}
        {!favoritesLoading && !products.length ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <Search className="mx-auto mb-4 size-8 text-muted-foreground/50" />
            <h3 className="font-medium">
              {favoritesOnly ? "Seus favoritos aparecem aqui" : "Nenhum produto encontrado"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {favoritesOnly
                ? "Toque no coração dos produtos que você gostar."
                : "Experimente outra busca ou volte em breve."}
            </p>
          </div>
        ) : null}
        <div
          className={
            list ? "grid gap-4" : "grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3"
          }
        >
          {products.map((product) => {
            const liked = selection.likes.includes(product.id);
            const available =
              product.available &&
              (!product.variants.length || product.variants.some((item) => item.available));
            const price = product.variants.length
              ? Math.min(...product.variants.map((item) => item.priceCents))
              : product.priceCents;

            return (
              <article
                key={product.id}
                className={`group relative flex overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md ${list ? "flex-row" : "flex-col"}`}
              >
                <button
                  type="button"
                  onClick={() => openProduct(product)}
                  className={`block text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${list ? "w-32 shrink-0 sm:w-48" : "w-full"}`}
                  aria-label={`Ver ${product.name}`}
                >
                  <ProductImage
                    image={product.images[0]}
                    name={product.name}
                    className={
                      list
                        ? "h-full"
                        : "transition-transform duration-500 group-hover:scale-[1.025]"
                    }
                  />
                </button>
                <div className={`absolute top-3 flex gap-1.5 ${list ? "left-3" : "right-3"}`}>
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="border border-white/60 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                    disabled={!selection.ready}
                    aria-label={liked ? `Descurtir ${product.name}` : `Curtir ${product.name}`}
                    aria-pressed={liked}
                    onClick={() => selection.toggleLike(product.id)}
                  >
                    <Heart className={liked ? "fill-rose-500 text-rose-500" : ""} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="border border-white/60 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                    aria-label={`Perguntar sobre ${product.name} no WhatsApp`}
                    disabled={!available || !store.whatsapp}
                    onClick={() => {
                      if (product.variants.length) {
                        openProduct(product);

                        return;
                      }

                      if (store.whatsapp)
                        window.open(
                          whatsappLink(
                            store.whatsapp,
                            `Olá! Tenho interesse em ${product.name} (${money(price)}).\n${store.url}`
                          ),
                          "_blank",
                          "noopener,noreferrer"
                        );
                    }}
                  >
                    <MessageCircle />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                      {product.category?.name ?? "Selecionado para você"}
                    </span>
                    {!available ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Indisponível
                      </Badge>
                    ) : null}
                  </div>
                  <h3>
                    <button
                      type="button"
                      onClick={() => openProduct(product)}
                      className="text-left font-heading text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-primary"
                    >
                      {product.name}
                    </button>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {product.description || "Conheça os detalhes deste produto."}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-5">
                    <div>
                      {product.variants.length ? (
                        <p className="text-[10px] text-muted-foreground">a partir de</p>
                      ) : null}
                      <p className="text-lg font-semibold tracking-tight">{money(price)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openProduct(product)}>
                      Ver detalhes
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!favoritesOnly && catalog.pagination.totalPages > 1 ? (
          <nav
            aria-label="Páginas do catálogo"
            className="mt-10 flex items-center justify-center gap-4"
          >
            <Button
              variant="outline"
              disabled={catalog.pagination.page <= 1}
              asChild={catalog.pagination.page > 1}
            >
              {catalog.pagination.page > 1 ? (
                <Link href={pageUrl(catalog.pagination.page - 1)}>
                  <ArrowLeft />
                  Anterior
                </Link>
              ) : (
                <span>Anterior</span>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {catalog.pagination.page} de {catalog.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={catalog.pagination.page >= catalog.pagination.totalPages}
              asChild={catalog.pagination.page < catalog.pagination.totalPages}
            >
              {catalog.pagination.page < catalog.pagination.totalPages ? (
                <Link href={pageUrl(catalog.pagination.page + 1)}>
                  Próxima
                  <ArrowRight />
                </Link>
              ) : (
                <span>Próxima</span>
              )}
            </Button>
          </nav>
        ) : null}
        <footer className="mt-16 flex flex-col items-center gap-3 border-t pt-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="size-3" />
            Atendimento direto com {store.name}
          </span>
          {showFreeBranding ? (
            <span>
              Criado com{" "}
              <span className="font-semibold text-foreground">
                Tua <span className="text-primary">Vitrine</span>
              </span>
            </span>
          ) : null}
        </footer>
      </main>
      {selected ? (
        <ProductDetail
          key={selected.id}
          product={selected}
          store={store}
          liked={selection.likes.includes(selected.id)}
          ready={selection.ready}
          onLike={() => selection.toggleLike(selected.id)}
          onAdd={addToCart}
          onClose={() => setSelected(null)}
        />
      ) : null}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={selection.cart}
        setCart={selection.setCart}
        store={store}
      />
    </div>
  );
}
