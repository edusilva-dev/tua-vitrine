import { z } from "zod";

export const analyticsEnvironmentSchema = z.enum(["development", "staging", "production"]);

export const analyticsPlanSchema = z.enum(["FREE", "ESSENTIAL", "PROFESSIONAL"]);

export const analyticsSurfaceSchema = z.enum(["landing", "admin", "storefront", "billing", "auth"]);

export const analyticsSourceSchema = z.enum([
  "email_password",
  "onboarding",
  "admin",
  "manual",
  "import",
  "direct",
  "organic",
  "social",
  "referral",
  "campaign",
  "share",
  "storefront",
  "webhook",
  "billing_portal",
]);

const internalIdSchema = z.string().uuid();
const countSchema = z.number().int().nonnegative();
const landingSourceSchema = z.enum(["direct", "organic", "social", "referral", "campaign"]);

export const landingPageViewedInputSchema = z
  .object({
    source: landingSourceSchema,
  })
  .strict();

export const landingCtaClickedInputSchema = z
  .object({
    source: landingSourceSchema,
    cta: z.enum(["start_free", "create_store", "start_trial"]),
    location: z.enum(["header", "hero", "pricing", "final_cta", "footer"]),
    selectedPlan: analyticsPlanSchema.optional(),
  })
  .strict()
  .refine(
    (value) => (value.location === "pricing") === Boolean(value.selectedPlan),
    "selectedPlan é obrigatório somente nos cards de preço."
  )
  .refine(
    (value) =>
      value.location !== "pricing" ||
      (value.selectedPlan === "FREE" && value.cta === "start_free") ||
      (value.selectedPlan !== "FREE" && value.cta === "start_trial"),
    "O CTA deve corresponder ao plano selecionado."
  );

export const accountCreatedInputSchema = z
  .object({
    signupPlan: analyticsPlanSchema,
    source: z.literal("email_password"),
  })
  .strict();

export const storeCreatedInputSchema = z
  .object({
    storeId: internalIdSchema,
    plan: analyticsPlanSchema,
    source: z.enum(["onboarding", "admin"]),
  })
  .strict();

export const storePublishedInputSchema = z
  .object({
    storeId: internalIdSchema,
    plan: analyticsPlanSchema,
    productCount: countSchema,
  })
  .strict();

export const productCreationStartedInputSchema = z
  .object({
    storeId: internalIdSchema,
    source: z.enum(["onboarding", "admin"]),
  })
  .strict();

export const productCreatedInputSchema = z
  .object({
    storeId: internalIdSchema,
    productId: internalIdSchema,
    creationMethod: z.enum(["manual", "import"]),
    isFirstProduct: z.boolean(),
  })
  .strict();

export const productDeletedInputSchema = z
  .object({
    storeId: internalIdSchema,
    productCount: z.number().int().positive(),
    operation: z.enum(["single", "bulk"]),
  })
  .strict();

export const catalogViewedInputSchema = z
  .object({
    storeId: internalIdSchema,
    plan: analyticsPlanSchema,
    source: z.enum(["direct", "campaign", "share"]),
  })
  .strict();

export const productViewedInputSchema = z
  .object({
    storeId: internalIdSchema,
    productId: internalIdSchema,
    source: z.enum(["direct", "campaign", "share"]),
  })
  .strict();

export const whatsappClickedInputSchema = z
  .object({
    storeId: internalIdSchema,
    location: z.enum(["store_hero", "product_card", "product_detail", "cart"]),
    productId: internalIdSchema.optional(),
    cartSize: countSchema.optional(),
  })
  .strict();

export const subscriptionStartedInputSchema = z
  .object({
    storeId: internalIdSchema,
    plan: z.enum(["ESSENTIAL", "PROFESSIONAL"]),
    billingStatus: z.enum(["TRIALING", "ACTIVE"]),
  })
  .strict();

export const subscriptionCancelledInputSchema = z
  .object({
    storeId: internalIdSchema,
    plan: z.enum(["ESSENTIAL", "PROFESSIONAL"]),
    effectiveImmediately: z.boolean(),
  })
  .strict();

export type LandingPageViewedInput = z.infer<typeof landingPageViewedInputSchema>;

export type LandingCtaClickedInput = z.infer<typeof landingCtaClickedInputSchema>;

export type AccountCreatedInput = z.infer<typeof accountCreatedInputSchema>;

export type StoreCreatedInput = z.infer<typeof storeCreatedInputSchema>;

export type StorePublishedInput = z.infer<typeof storePublishedInputSchema>;

export type ProductCreationStartedInput = z.infer<typeof productCreationStartedInputSchema>;

export type ProductCreatedInput = z.infer<typeof productCreatedInputSchema>;

export type ProductDeletedInput = z.infer<typeof productDeletedInputSchema>;

export type CatalogViewedInput = z.infer<typeof catalogViewedInputSchema>;

export type ProductViewedInput = z.infer<typeof productViewedInputSchema>;

export type WhatsappClickedInput = z.infer<typeof whatsappClickedInputSchema>;

export type SubscriptionStartedInput = z.infer<typeof subscriptionStartedInputSchema>;

export type SubscriptionCancelledInput = z.infer<typeof subscriptionCancelledInputSchema>;

const commonEventSchema = z
  .object({
    schema_version: z.literal(1),
    environment: analyticsEnvironmentSchema,
    release: z.string().min(1).nullable(),
    surface: analyticsSurfaceSchema,
    source: analyticsSourceSchema,
  })
  .strict();

export const analyticsEventSchemas = {
  landing_page_viewed: commonEventSchema.extend({
    surface: z.literal("landing"),
    source: landingSourceSchema,
  }),
  landing_cta_clicked: commonEventSchema
    .extend({
      surface: z.literal("landing"),
      source: landingSourceSchema,
      cta: z.enum(["start_free", "create_store", "start_trial"]),
      location: z.enum(["header", "hero", "pricing", "final_cta", "footer"]),
      selected_plan: analyticsPlanSchema.optional(),
    })
    .refine(
      (value) => (value.location === "pricing") === Boolean(value.selected_plan),
      "selected_plan é obrigatório somente nos cards de preço."
    )
    .refine(
      (value) =>
        value.location !== "pricing" ||
        (value.selected_plan === "FREE" && value.cta === "start_free") ||
        (value.selected_plan !== "FREE" && value.cta === "start_trial"),
      "O CTA deve corresponder ao plano selecionado."
    ),
  account_created: commonEventSchema.extend({
    surface: z.literal("auth"),
    source: z.literal("email_password"),
    signup_plan: analyticsPlanSchema,
  }),
  store_created: commonEventSchema.extend({
    surface: z.literal("admin"),
    source: z.enum(["onboarding", "admin"]),
    store_id: internalIdSchema,
    plan: analyticsPlanSchema,
  }),
  store_published: commonEventSchema.extend({
    surface: z.literal("admin"),
    source: z.literal("onboarding"),
    store_id: internalIdSchema,
    plan: analyticsPlanSchema,
    product_count: countSchema,
  }),
  product_creation_started: commonEventSchema.extend({
    surface: z.literal("admin"),
    source: z.enum(["onboarding", "admin"]),
    store_id: internalIdSchema,
  }),
  product_created: commonEventSchema.extend({
    surface: z.literal("admin"),
    source: z.enum(["manual", "import"]),
    store_id: internalIdSchema,
    product_id: internalIdSchema,
    creation_method: z.enum(["manual", "import"]),
    is_first_product: z.boolean(),
  }),
  product_deleted: commonEventSchema.extend({
    surface: z.literal("admin"),
    source: z.literal("admin"),
    store_id: internalIdSchema,
    product_count: z.number().int().positive(),
    operation: z.enum(["single", "bulk"]),
  }),
  catalog_viewed: commonEventSchema.extend({
    surface: z.literal("storefront"),
    source: z.enum(["direct", "campaign", "share"]),
    store_id: internalIdSchema,
    plan: analyticsPlanSchema,
  }),
  product_viewed: commonEventSchema.extend({
    surface: z.literal("storefront"),
    source: z.enum(["direct", "campaign", "share"]),
    store_id: internalIdSchema,
    product_id: internalIdSchema,
  }),
  whatsapp_clicked: commonEventSchema.extend({
    surface: z.literal("storefront"),
    source: z.literal("storefront"),
    store_id: internalIdSchema,
    location: z.enum(["store_hero", "product_card", "product_detail", "cart"]),
    product_id: internalIdSchema.optional(),
    cart_size: countSchema.optional(),
  }),
  subscription_started: commonEventSchema.extend({
    surface: z.literal("billing"),
    source: z.literal("webhook"),
    store_id: internalIdSchema,
    plan: z.enum(["ESSENTIAL", "PROFESSIONAL"]),
    billing_status: z.enum(["TRIALING", "ACTIVE"]),
  }),
  subscription_cancelled: commonEventSchema.extend({
    surface: z.literal("billing"),
    source: z.enum(["webhook", "billing_portal"]),
    store_id: internalIdSchema,
    plan: z.enum(["ESSENTIAL", "PROFESSIONAL"]),
    effective_immediately: z.boolean(),
  }),
} as const;

export type AnalyticsEventName = keyof typeof analyticsEventSchemas;

export type AnalyticsEventProperties = z.infer<(typeof analyticsEventSchemas)[AnalyticsEventName]>;

export type AnalyticsRuntimeContext = {
  environment: z.infer<typeof analyticsEnvironmentSchema>;
  release: string | null;
};

type EventDefinition = {
  name: AnalyticsEventName;
  properties: AnalyticsEventProperties;
};

function common(
  context: AnalyticsRuntimeContext,
  surface: z.infer<typeof analyticsSurfaceSchema>,
  source: z.infer<typeof analyticsSourceSchema>
) {
  return {
    schema_version: 1 as const,
    environment: context.environment,
    release: context.release?.trim() || null,
    surface,
    source,
  };
}

function validateEvent<TName extends AnalyticsEventName>(
  name: TName,
  properties: unknown
): EventDefinition | null {
  const result = analyticsEventSchemas[name].safeParse(properties);

  if (result.success) return { name, properties: result.data as AnalyticsEventProperties };

  if (process.env.NODE_ENV === "production") return null;

  throw result.error;
}

export const analyticsEvents = {
  landingPageViewed(input: LandingPageViewedInput, context: AnalyticsRuntimeContext) {
    const value = landingPageViewedInputSchema.parse(input);

    return validateEvent("landing_page_viewed", {
      ...common(context, "landing", value.source),
    });
  },
  landingCtaClicked(input: LandingCtaClickedInput, context: AnalyticsRuntimeContext) {
    const value = landingCtaClickedInputSchema.parse(input);

    return validateEvent("landing_cta_clicked", {
      ...common(context, "landing", value.source),
      cta: value.cta,
      location: value.location,
      ...(value.selectedPlan ? { selected_plan: value.selectedPlan } : {}),
    });
  },
  accountCreated(input: AccountCreatedInput, context: AnalyticsRuntimeContext) {
    const value = accountCreatedInputSchema.parse(input);

    return validateEvent("account_created", {
      ...common(context, "auth", value.source),
      signup_plan: value.signupPlan,
    });
  },
  storeCreated(input: StoreCreatedInput, context: AnalyticsRuntimeContext) {
    const value = storeCreatedInputSchema.parse(input);

    return validateEvent("store_created", {
      ...common(context, "admin", value.source),
      store_id: value.storeId,
      plan: value.plan,
    });
  },
  storePublished(input: StorePublishedInput, context: AnalyticsRuntimeContext) {
    const value = storePublishedInputSchema.parse(input);

    return validateEvent("store_published", {
      ...common(context, "admin", "onboarding"),
      store_id: value.storeId,
      plan: value.plan,
      product_count: value.productCount,
    });
  },
  productCreationStarted(input: ProductCreationStartedInput, context: AnalyticsRuntimeContext) {
    const value = productCreationStartedInputSchema.parse(input);

    return validateEvent("product_creation_started", {
      ...common(context, "admin", value.source),
      store_id: value.storeId,
    });
  },
  productCreated(input: ProductCreatedInput, context: AnalyticsRuntimeContext) {
    const value = productCreatedInputSchema.parse(input);

    return validateEvent("product_created", {
      ...common(context, "admin", value.creationMethod),
      store_id: value.storeId,
      product_id: value.productId,
      creation_method: value.creationMethod,
      is_first_product: value.isFirstProduct,
    });
  },
  productDeleted(input: ProductDeletedInput, context: AnalyticsRuntimeContext) {
    const value = productDeletedInputSchema.parse(input);

    return validateEvent("product_deleted", {
      ...common(context, "admin", "admin"),
      store_id: value.storeId,
      product_count: value.productCount,
      operation: value.operation,
    });
  },
  catalogViewed(input: CatalogViewedInput, context: AnalyticsRuntimeContext) {
    const value = catalogViewedInputSchema.parse(input);

    return validateEvent("catalog_viewed", {
      ...common(context, "storefront", value.source),
      store_id: value.storeId,
      plan: value.plan,
    });
  },
  productViewed(input: ProductViewedInput, context: AnalyticsRuntimeContext) {
    const value = productViewedInputSchema.parse(input);

    return validateEvent("product_viewed", {
      ...common(context, "storefront", value.source),
      store_id: value.storeId,
      product_id: value.productId,
    });
  },
  whatsappClicked(input: WhatsappClickedInput, context: AnalyticsRuntimeContext) {
    const value = whatsappClickedInputSchema.parse(input);

    return validateEvent("whatsapp_clicked", {
      ...common(context, "storefront", "storefront"),
      store_id: value.storeId,
      location: value.location,
      ...(value.productId ? { product_id: value.productId } : {}),
      ...(value.cartSize === undefined ? {} : { cart_size: value.cartSize }),
    });
  },
  subscriptionStarted(input: SubscriptionStartedInput, context: AnalyticsRuntimeContext) {
    const value = subscriptionStartedInputSchema.parse(input);

    return validateEvent("subscription_started", {
      ...common(context, "billing", "webhook"),
      store_id: value.storeId,
      plan: value.plan,
      billing_status: value.billingStatus,
    });
  },
  subscriptionCancelled(
    input: SubscriptionCancelledInput,
    context: AnalyticsRuntimeContext,
    source: "webhook" | "billing_portal" = "webhook"
  ) {
    const value = subscriptionCancelledInputSchema.parse(input);

    return validateEvent("subscription_cancelled", {
      ...common(context, "billing", source),
      store_id: value.storeId,
      plan: value.plan,
      effective_immediately: value.effectiveImmediately,
    });
  },
};

export type AnalyticsEventCatalog = typeof analyticsEvents;
