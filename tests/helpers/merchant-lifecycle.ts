import type { MerchantLifecycleAnalytics } from "@/modules/observability/server/merchant-lifecycle";

type CapturedCall = {
  event: "store_created" | "store_published" | "product_created" | "product_deleted";
  distinctId: string;
  input: Record<string, unknown>;
};

export function createMerchantLifecycleRecorder() {
  const calls: CapturedCall[] = [];
  const analytics: MerchantLifecycleAnalytics = {
    async storeCreated(identity, input) {
      calls.push({ event: "store_created", distinctId: identity.distinctId, input });
    },
    async storePublished(identity, input) {
      calls.push({ event: "store_published", distinctId: identity.distinctId, input });
    },
    async productCreated(identity, input) {
      calls.push({ event: "product_created", distinctId: identity.distinctId, input });
    },
    async productCreatedMany(identity, inputs) {
      calls.push(
        ...inputs.map((input) => ({
          event: "product_created" as const,
          distinctId: identity.distinctId,
          input,
        }))
      );
    },
    async productDeleted(identity, input) {
      calls.push({ event: "product_deleted", distinctId: identity.distinctId, input });
    },
  };

  return { analytics, calls };
}
