import { AuthForm } from "@/modules/auth/components/auth-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const query = await searchParams;

  return <AuthForm mode="verify" invalidLink={Boolean(query.error)} />;
}
