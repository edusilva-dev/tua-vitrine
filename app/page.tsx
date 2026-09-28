import {
  ArrowRight,
  BarChart3,
  Check,
  Heart,
  MessageCircle,
  Package,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: ShoppingBag,
    title: "Catálogo fácil de montar",
    description: "Cadastre produtos, variações, preços e fotos sem depender de ninguém.",
  },
  {
    icon: Palette,
    title: "A cara do seu negócio",
    description: "Escolha cores, capa e identidade para deixar sua vitrine do seu jeito.",
  },
  {
    icon: MessageCircle,
    title: "Pedidos pelo WhatsApp",
    description: "O cliente escolhe os produtos e chama você com o pedido organizado.",
  },
  {
    icon: BarChart3,
    title: "Interesse que dá para medir",
    description: "Acompanhe visitas, visualizações e os favoritos dos clientes.",
  },
];

const plans = [
  {
    name: "Free",
    slug: "free",
    price: "0",
    description: "Para conhecer a Tua Vitrine e colocar seus primeiros produtos no ar.",
    features: [
      "1 vitrine online",
      "Até 10 produtos",
      "Pedidos pelo WhatsApp",
      "Logo da sua marca",
      "Estatísticas dos últimos 7 dias",
    ],
    popular: false,
  },
  {
    name: "Essencial",
    slug: "essencial",
    price: "19",
    description: "Para ganhar tempo e acompanhar o interesse dos clientes.",
    features: [
      "1 vitrine online",
      "Até 50 produtos",
      "Importação de produtos por Excel",
      "Pedidos pelo WhatsApp",
      "Logo e cores da sua marca",
      "Histórico completo de estatísticas",
    ],
    popular: true,
  },
  {
    name: "Profissional",
    slug: "profissional",
    price: "39",
    description: "Para catálogos maiores e campanhas que destacam seus produtos.",
    features: [
      "1 vitrine online",
      "Produtos ilimitados*",
      "Importação de produtos por Excel",
      "Pedidos pelo WhatsApp",
      "Personalização completa",
      "Histórico completo de estatísticas",
      "Banner para campanha promocional",
    ],
    popular: false,
  },
] as const;

const steps = [
  { number: "01", title: "Crie sua conta", description: "Comece grátis, sem informar cartão." },
  { number: "02", title: "Monte sua vitrine", description: "Adicione sua marca e seus produtos." },
  { number: "03", title: "Compartilhe e venda", description: "Envie seu link e receba pedidos." },
];

export default function Home() {
  return (
    <div className="min-h-svh overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-foreground/8 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-brand-forest text-brand-lime">
              <Store size={20} aria-hidden="true" />
            </span>
            tua vitrine<span className="-ml-2.5 text-brand-sage">.</span>
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-8 md:flex">
            <Link href="#recursos" className="text-sm text-brand-copy hover:text-brand-forest">
              Recursos
            </Link>
            <Link href="#como-funciona" className="text-sm text-brand-copy hover:text-brand-forest">
              Como funciona
            </Link>
            <Link href="#planos" className="text-sm text-brand-copy hover:text-brand-forest">
              Planos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/entrar">Entrar</Link>
            </Button>
            <Button asChild className="bg-brand-forest px-5 hover:bg-primary">
              <Link href="/cadastro">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>
      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(213,233,188,.75),transparent_32%),radial-gradient(circle_at_8%_80%,rgba(89,142,136,.15),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 lg:grid-cols-[1.04fr_.96fr] lg:px-8 lg:py-24 xl:py-28">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-sage/20 bg-white/65 px-3 py-1.5 text-xs font-medium text-brand-ink-green shadow-sm">
                <Sparkles size={14} />
                14 dias grátis para colocar sua loja no ar
              </span>
              <h1 className="mt-7 font-heading text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Seu negócio mais perto de quem quer comprar.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-brand-copy sm:text-lg sm:leading-8">
                Crie uma vitrine bonita, compartilhe seus produtos e transforme interesse em
                conversa pelo WhatsApp.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-brand-forest px-6 hover:bg-primary">
                  <Link href="/cadastro">
                    Criar minha vitrine grátis
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-foreground/15 bg-white/60 px-6"
                >
                  <Link href="#como-funciona">Ver como funciona</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-brand-meta">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} />
                  Sem cartão de crédito
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} />
                  Cancele quando quiser
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} />
                  Pronta em poucos minutos
                </span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-5 rotate-2 rounded-[2rem] bg-brand-lime/70" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_28px_80px_rgba(24,60,61,.16)]">
                <div className="flex items-center justify-between border-b bg-brand-forest px-5 py-4 text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand-lime text-brand-forest">
                      <Store size={17} />
                    </span>
                    <span className="font-heading text-sm font-semibold">Ateliê da Ana</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/70">
                    MINHA VITRINE
                  </span>
                </div>
                <div className="bg-brand-warm p-5 sm:p-7">
                  <div className="rounded-2xl bg-brand-showcase p-5">
                    <p className="text-[10px] font-semibold tracking-[.18em] text-brand-label">
                      FEITO À MÃO
                    </p>
                    <p className="mt-2 font-heading text-xl font-semibold">
                      Peças que deixam a casa mais sua.
                    </p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      { name: "Vaso Serena", price: "R$ 89", color: "bg-brand-product-clay" },
                      { name: "Kit Aurora", price: "R$ 129", color: "bg-brand-product-sage" },
                    ].map((product) => (
                      <div key={product.name} className="rounded-xl bg-white p-2.5 shadow-sm">
                        <div className={cn("aspect-[4/3] rounded-lg", product.color)}>
                          <div className="grid h-full place-items-center">
                            <Package className="text-white/65" size={34} />
                          </div>
                        </div>
                        <p className="mt-3 text-xs font-medium">{product.name}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <strong className="text-xs">{product.price}</strong>
                          <span className="grid size-7 place-items-center rounded-full bg-brand-forest text-white">
                            <MessageCircle size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-xl border border-foreground/8 bg-white px-4 py-3 shadow-xl sm:-left-8">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand-icon">
                  <Heart size={17} />
                </span>
                <div>
                  <p className="text-[10px] text-brand-copy-faint">Interesse crescendo</p>
                  <p className="text-sm font-semibold">+28 favoritos</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="recursos" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">TUDO NO MESMO LUGAR</p>
              <h2 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Simples para você. Bonita para quem compra.
              </h2>
              <p className="mt-4 leading-7 text-brand-copy-subtle">
                As ferramentas certas para apresentar seus produtos e abrir novas conversas todos os
                dias.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-foreground/8 bg-brand-card-soft p-6"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-mist text-brand-ink-green">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-brand-copy-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="como-funciona"
          className="scroll-mt-20 bg-brand-forest py-20 text-white sm:py-24"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:px-8">
            <div>
              <p className="text-[10px] font-semibold tracking-[.17em] text-brand-lime-muted">
                DO ZERO AO SEU LINK
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Sua vitrine pronta em três passos.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="border-t border-white/15 pt-5">
                  <span className="font-mono text-xs text-brand-lime-muted">{step.number}</span>
                  <h3 className="mt-4 font-heading font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="planos" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">PLANOS QUE CABEM NO SEU NEGÓCIO</p>
              <h2 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Comece grátis. Cresça no seu ritmo.
              </h2>
              <p className="mt-4 text-brand-copy-subtle">
                Comece no Free ou teste todos os recursos por 14 dias ao escolher um plano pago.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative gap-0 rounded-3xl py-0 shadow-sm",
                    plan.popular && "bg-brand-forest text-white ring-brand-forest"
                  )}
                >
                  {plan.popular ? (
                    <span className="absolute right-6 top-6 rounded-full bg-brand-lime px-3 py-1 text-[10px] font-semibold tracking-wider text-brand-forest">
                      MAIS ESCOLHIDO
                    </span>
                  ) : null}
                  <CardHeader className="p-7 pb-5 sm:p-8 sm:pb-5">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p
                      className={cn(
                        "max-w-xs text-sm leading-6 text-brand-copy-muted",
                        plan.popular && "text-white/60"
                      )}
                    >
                      {plan.description}
                    </p>
                    <div className="mt-5 flex items-end gap-1">
                      <span
                        className={cn(
                          "mb-2 text-sm text-brand-copy-muted",
                          plan.popular && "text-white/60"
                        )}
                      >
                        R$
                      </span>
                      <strong className="font-heading text-5xl font-semibold">{plan.price}</strong>
                      <span
                        className={cn(
                          "mb-2 text-sm text-brand-copy-muted",
                          plan.popular && "text-white/60"
                        )}
                      >
                        /mês
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-7 sm:px-8">
                    <ul className="space-y-3 border-t border-current/10 pt-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <span
                            className={cn(
                              "grid size-5 place-items-center rounded-full bg-brand-mist text-brand-ink-green",
                              plan.popular && "bg-white/10 text-brand-lime"
                            )}
                          >
                            <Check size={13} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto p-7 pt-8 sm:p-8 sm:pt-8">
                    <Button
                      asChild
                      size="lg"
                      variant={plan.popular ? "secondary" : "default"}
                      className={cn(
                        "h-12 w-full",
                        plan.popular
                          ? "bg-brand-lime text-brand-forest hover:bg-brand-lime-hover"
                          : "bg-brand-forest hover:bg-primary"
                      )}
                    >
                      <Link href={`/cadastro?plano=${plan.slug}`}>
                        {plan.name === "Free" ? "Começar grátis" : "Testar por 14 dias"}
                        <ArrowRight />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-brand-copy-muted">
              <ShieldCheck size={15} />
              Sem cartão para começar. *Limite técnico de uso justo de 1.000 produtos.
            </div>
          </div>
        </section>
        <section className="bg-brand-mist py-16 sm:py-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center px-5 text-center">
            <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Sua próxima venda pode começar com um link.
            </h2>
            <p className="mt-4 text-brand-copy">
              Crie sua vitrine hoje e experimente grátis por 14 dias.
            </p>
            <Button asChild size="lg" className="mt-7 h-12 bg-brand-forest px-7 hover:bg-primary">
              <Link href="/cadastro">
                Quero criar minha vitrine
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="bg-brand-forest-deep text-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link href="/" className="font-heading text-lg font-bold text-white">
            tua vitrine<span className="text-brand-lime-muted">.</span>
          </Link>
          <p className="text-xs">Sua loja online, simples e do seu jeito.</p>
          <div className="flex gap-5 text-xs">
            <Link href="/entrar" className="hover:text-white">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-white">
              Criar conta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
