import { OnboardingFlow } from "@/modules/onboarding/components/onboarding-flow";
import { getCurrentStore } from "@/modules/stores/server/service";
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [store, params] = await Promise.all([getCurrentStore(), searchParams]);

  return (
    <OnboardingFlow
      key={params.new === "1" ? "new" : (store?.id ?? "first")}
      store={store}
      newStore={params.new === "1"}
    />
  );
}
