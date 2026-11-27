import "server-only";

import type {
  ProductCreatedInput,
  ProductDeletedInput,
  StoreCreatedInput,
  StorePublishedInput,
} from "../contracts/events";
import { getServerAnalytics } from "./analytics";

type AnalyticsIdentity = { distinctId: string };

export type MerchantLifecycleAnalytics = {
  storeCreated(identity: AnalyticsIdentity, input: StoreCreatedInput): Promise<void>;
  storePublished(identity: AnalyticsIdentity, input: StorePublishedInput): Promise<void>;
  productCreated(identity: AnalyticsIdentity, input: ProductCreatedInput): Promise<void>;
  productCreatedMany(identity: AnalyticsIdentity, inputs: ProductCreatedInput[]): Promise<void>;
  productDeleted(identity: AnalyticsIdentity, input: ProductDeletedInput): Promise<void>;
};

export type MerchantLifecycleOptions = {
  analytics?: MerchantLifecycleAnalytics;
};

export function merchantLifecycleAnalytics(options?: MerchantLifecycleOptions) {
  return options?.analytics ?? getServerAnalytics();
}
