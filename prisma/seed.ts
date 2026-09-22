import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const url = process.env.DATABASE_URL;

if (!url) throw new Error("DATABASE_URL é obrigatória.");

if (
  !["development", "local", "test"].includes(process.env.APP_ENV ?? "") ||
  process.env.LOCAL_ONLY !== "true"
)
  throw new Error("O seed de demonstração funciona somente no ambiente local.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const examples = [
  {
    name: "Ateliê Aurora",
    slug: "atelie-aurora",
    color: "#9a573e",
    tagline: "Feito à mão, escolhido com carinho.",
    category: "Feito à mão",
    products: [
      {
        name: "Vaso orgânico em cerâmica",
        description:
          "Cerâmica artesanal com acabamento fosco. Cada peça tem pequenas variações que a tornam única.",
        price: 8900,
        option: "Cor",
        values: ["Areia", "Terracota"],
      },
      {
        name: "Cesto de palha natural",
        description: "Trançado manualmente para organizar e decorar seus cantinhos favoritos.",
        price: 6900,
        option: "Tamanho",
        values: ["Pequeno", "Médio"],
      },
      {
        name: "Dupla de velas botânicas",
        description: "Velas decorativas com cera vegetal e aromas suaves.",
        price: 4900,
        option: "Aroma",
        values: ["Lavanda", "Capim-limão"],
      },
      {
        name: "Caneca de barro esmaltada",
        description: "Uma pausa mais bonita para seu café. Produção artesanal em pequenos lotes.",
        price: 5900,
        option: "Cor",
        values: ["Creme", "Oliva"],
      },
    ],
  },
  {
    name: "Café do Bairro",
    slug: "cafe-do-bairro",
    color: "#38604d",
    tagline: "Café fresco e boas conversas.",
    category: "Cafés",
    products: [
      {
        name: "Café especial da casa",
        description: "Torra média, notas de chocolate e caramelo. Embalagem de 250 g.",
        price: 3200,
        option: "Moagem",
        values: ["Em grãos", "Moído"],
      },
      {
        name: "Blend manhã tranquila",
        description: "Um café equilibrado para começar o dia. Embalagem de 250 g.",
        price: 2900,
        option: "Moagem",
        values: ["Em grãos", "Moído"],
      },
      {
        name: "Bolo caseiro de laranja",
        description: "Receita da casa com laranja fresca. Encomende pelo WhatsApp.",
        price: 4500,
        option: "Tamanho",
        values: ["Pequeno", "Grande"],
      },
      {
        name: "Cookie com chocolate",
        description: "Cookie artesanal com pedaços de chocolate, assado no dia.",
        price: 900,
        option: "Embalagem",
        values: ["Unidade", "Dupla"],
      },
    ],
  },
];

try {
  for (const example of examples) {
    if (await db.store.findUnique({ where: { slug: example.slug } })) continue;

    await db.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: example.name,
          slug: example.slug,
          whatsapp: "+5511999999999",
          status: "ACTIVE",
          onboardingCompletedAt: new Date(),
          primaryColor: example.color,
          customization: { version: 1, tagline: example.tagline },
        },
      });
      const category = await tx.category.create({
        data: { storeId: store.id, name: example.category, slug: `${example.slug}-categoria` },
      });

      for (const item of example.products) {
        const product = await tx.product.create({
          data: {
            storeId: store.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            priceCents: item.price,
          },
        });
        const option = await tx.productOption.create({
          data: { storeId: store.id, productId: product.id, name: item.option },
        });

        for (const [index, label] of item.values.entries()) {
          const value = await tx.productOptionValue.create({
            data: { storeId: store.id, productId: product.id, optionId: option.id, value: label },
          });
          const variant = await tx.productVariant.create({
            data: {
              storeId: store.id,
              productId: product.id,
              label,
              combinationKey: JSON.stringify([[item.option, label]]),
              priceCents: item.price + index * 500,
              available: true,
            },
          });

          await tx.variantOptionValue.create({
            data: {
              storeId: store.id,
              productId: product.id,
              variantId: variant.id,
              optionId: option.id,
              valueId: value.id,
            },
          });
        }
      }
    });
  }
} finally {
  await db.$disconnect();
}
