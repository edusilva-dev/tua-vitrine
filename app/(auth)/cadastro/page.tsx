import { AuthForm } from "@/modules/auth/components/auth-form";

const validPlans = new Set(["free", "essencial", "profissional"] as const);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const signupPlan = validPlans.has(plano as "free" | "essencial" | "profissional")
    ? (plano as "free" | "essencial" | "profissional")
    : "free";

  return <AuthForm mode="signup" signupPlan={signupPlan} />;
}
