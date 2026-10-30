import { z } from "zod";
import { billingPlanSchema, paidBillingPlanSchema } from "@/modules/billing/contracts";

const idSchema = z.string().uuid();
const eventNameSchema = z.enum([
  "account_created",
  "store_created",
  "store_published",
  "product_creation_started",
  "product_created",
  "product_deleted",
  "catalog_viewed",
  "product_viewed",
  "whatsapp_clicked",
  "subscription_started",
  "subscription_cancelled",
]);
const surfaceSchema = z.enum(["admin", "storefront", "billing", "auth"]);
const sourceSchema = z.enum([
  "better_auth",
  "onboarding",
  "product_form",
  "catalog_service",
  "storefront",
  "stripe_webhook",
]);
const creationMethodSchema = z.enum(["manual", "import"]);
const deletionOperationSchema = z.enum(["single", "bulk"]);
const whatsappLocationSchema = z.enum(["store_hero", "product_card", "product_detail", "cart"]);
const activeBillingStatusSchema = z.enum(["TRIALING", "ACTIVE"]);

export interface AccountCreatedPayload {
  signupPlan: z.infer<typeof billingPlanSchema>;
}

export interface StoreCreatedPayload {
  storeId: string;
  plan: z.infer<typeof billingPlanSchema>;
}

export interface StorePublishedPayload {
  storeId: string;
  plan: z.infer<typeof billingPlanSchema>;
  productCount: number;
}

export interface ProductCreationStartedPayload {
  storeId: string;
}

export interface ProductCreatedPayload {
  storeId: string;
  productId: string;
  creationMethod: z.infer<typeof creationMethodSchema>;
  isFirstProduct: boolean;
}

export interface ProductDeletedPayload {
  storeId: string;
  productCount: number;
  operation: z.infer<typeof deletionOperationSchema>;
}

export interface CatalogViewedPayload {
  storeId: string;
  plan: z.infer<typeof billingPlanSchema>;
}

export interface ProductViewedPayload {
  storeId: string;
  productId: string;
}

export interface WhatsappClickedPayload {
  storeId: string;
  location: z.infer<typeof whatsappLocationSchema>;
  productId?: string | undefined;
  cartSize?: number | undefined;
}

export interface SubscriptionStartedPayload {
  storeId: string;
  plan: z.infer<typeof paidBillingPlanSchema>;
  billingStatus: z.infer<typeof activeBillingStatusSchema>;
}

export interface SubscriptionCancelledPayload {
  storeId: string;
  plan: z.infer<typeof billingPlanSchema>;
  effectiveImmediately: boolean;
}

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null;
}

export interface AnalyticsEventContext {
  environment: "development" | "staging" | "production";
  release: string | null;
}

export interface PreparedAnalyticsEvent {
  name: z.infer<typeof eventNameSchema>;
  properties: AnalyticsProperties;
}

export interface AnalyticsEventDefinition<Payload> {
  name: PreparedAnalyticsEvent["name"];
  surface: z.infer<typeof surfaceSchema>;
  source: z.infer<typeof sourceSchema>;
  schema: z.ZodType<Payload>;
  serialize(payload: Payload): AnalyticsProperties;
}

const accountCreated: AnalyticsEventDefinition<AccountCreatedPayload> = {
  name: "account_created",
  surface: "auth",
  source: "better_auth",
  schema: z.strictObject({ signupPlan: billingPlanSchema }),
  serialize: (payload) => ({ signup_plan: payload.signupPlan }),
};

const storeCreated: AnalyticsEventDefinition<StoreCreatedPayload> = {
  name: "store_created",
  surface: "admin",
  source: "onboarding",
  schema: z.strictObject({ storeId: idSchema, plan: billingPlanSchema }),
  serialize: (payload) => ({ store_id: payload.storeId, plan: payload.plan }),
};

const storePublished: AnalyticsEventDefinition<StorePublishedPayload> = {
  name: "store_published",
  surface: "admin",
  source: "onboarding",
  schema: z.strictObject({
    storeId: idSchema,
    plan: billingPlanSchema,
    productCount: z.number().int().nonnegative(),
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    plan: payload.plan,
    product_count: payload.productCount,
  }),
};

const productCreationStarted: AnalyticsEventDefinition<ProductCreationStartedPayload> = {
  name: "product_creation_started",
  surface: "admin",
  source: "product_form",
  schema: z.strictObject({ storeId: idSchema }),
  serialize: (payload) => ({ store_id: payload.storeId }),
};

const productCreated: AnalyticsEventDefinition<ProductCreatedPayload> = {
  name: "product_created",
  surface: "admin",
  source: "catalog_service",
  schema: z.strictObject({
    storeId: idSchema,
    productId: idSchema,
    creationMethod: creationMethodSchema,
    isFirstProduct: z.boolean(),
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    product_id: payload.productId,
    creation_method: payload.creationMethod,
    is_first_product: payload.isFirstProduct,
  }),
};

const productDeleted: AnalyticsEventDefinition<ProductDeletedPayload> = {
  name: "product_deleted",
  surface: "admin",
  source: "catalog_service",
  schema: z.strictObject({
    storeId: idSchema,
    productCount: z.number().int().nonnegative(),
    operation: deletionOperationSchema,
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    product_count: payload.productCount,
    operation: payload.operation,
  }),
};

const catalogViewed: AnalyticsEventDefinition<CatalogViewedPayload> = {
  name: "catalog_viewed",
  surface: "storefront",
  source: "storefront",
  schema: z.strictObject({ storeId: idSchema, plan: billingPlanSchema }),
  serialize: (payload) => ({ store_id: payload.storeId, plan: payload.plan }),
};

const productViewed: AnalyticsEventDefinition<ProductViewedPayload> = {
  name: "product_viewed",
  surface: "storefront",
  source: "storefront",
  schema: z.strictObject({ storeId: idSchema, productId: idSchema }),
  serialize: (payload) => ({ store_id: payload.storeId, product_id: payload.productId }),
};

const whatsappClicked: AnalyticsEventDefinition<WhatsappClickedPayload> = {
  name: "whatsapp_clicked",
  surface: "storefront",
  source: "storefront",
  schema: z.strictObject({
    storeId: idSchema,
    location: whatsappLocationSchema,
    productId: idSchema.optional(),
    cartSize: z.number().int().positive().optional(),
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    location: payload.location,
    ...(payload.productId ? { product_id: payload.productId } : {}),
    ...(payload.cartSize ? { cart_size: payload.cartSize } : {}),
  }),
};

const subscriptionStarted: AnalyticsEventDefinition<SubscriptionStartedPayload> = {
  name: "subscription_started",
  surface: "billing",
  source: "stripe_webhook",
  schema: z.strictObject({
    storeId: idSchema,
    plan: paidBillingPlanSchema,
    billingStatus: activeBillingStatusSchema,
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    plan: payload.plan,
    billing_status: payload.billingStatus,
  }),
};

const subscriptionCancelled: AnalyticsEventDefinition<SubscriptionCancelledPayload> = {
  name: "subscription_cancelled",
  surface: "billing",
  source: "stripe_webhook",
  schema: z.strictObject({
    storeId: idSchema,
    plan: billingPlanSchema,
    effectiveImmediately: z.boolean(),
  }),
  serialize: (payload) => ({
    store_id: payload.storeId,
    plan: payload.plan,
    effective_immediately: payload.effectiveImmediately,
  }),
};

export const observabilityEvents = {
  accountCreated,
  storeCreated,
  storePublished,
  productCreationStarted,
  productCreated,
  productDeleted,
  catalogViewed,
  productViewed,
  whatsappClicked,
  subscriptionStarted,
  subscriptionCancelled,
};

export function prepareAnalyticsEvent<Payload>(
  definition: AnalyticsEventDefinition<Payload>,
  payload: Payload,
  context: AnalyticsEventContext,
  strict: boolean
): PreparedAnalyticsEvent | null {
  const parsed = definition.schema.safeParse(payload);

  if (!parsed.success) {
    if (strict) throw parsed.error;

    return null;
  }

  return {
    name: definition.name,
    properties: {
      schema_version: 1,
      environment: context.environment,
      release: context.release,
      surface: definition.surface,
      source: definition.source,
      ...definition.serialize(parsed.data),
    },
  };
}
